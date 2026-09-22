import { createHash, randomUUID } from 'node:crypto'
import { HttpError } from '../http/http-error.js'
import { createStorageAccessAdapter } from '../storage/access-adapter.js'
import { assertStorageLimitsConfigured, sanitizeFilename, validateDeclaredFile } from './file-validation.js'
import { assertV2MutationAllowed, requireV2Owner } from '../auth/v2-auth.js'

function refId(reference) {
  return reference.split('/').at(-1)
}

function timestampDate(value) {
  return value?.toDate?.() || (value instanceof Date ? value : null)
}

function usageBytes(snapshot) {
  const value = snapshot.exists ? snapshot.data()?.bytes : 0
  return Number.isSafeInteger(value) && value >= 0 ? value : 0
}

function validateV2TargetPath(targetPath) {
  const segments = typeof targetPath === 'string' ? targetPath.split('/') : []
  if (!segments[0]?.startsWith('v2_') || segments.length < 2 || segments.length % 2 !== 0) {
    throw new HttpError(400, 'Attachment targets must be V2 resources', 'invalid_attachment_target')
  }
}

export function createAttachmentLifecycle({
  db,
  idempotency,
  storageProvider,
  storageConfig,
  featureFlags,
  assertStorageIsolation = () => storageProvider.verifyIsolation(),
  now = () => new Date(),
  readMode = 'signed-url',
  authorizeRead,
  collections: collectionOverrides = {}
}) {
  if (!db || !idempotency || !storageProvider || !featureFlags) {
    throw new TypeError('db, idempotency, storageProvider, and featureFlags are required')
  }
  const collections = {
    attachments: 'v2_attachments',
    usage: 'v2_attachment_usage',
    links: 'v2_attachment_links',
    targetUsage: 'v2_attachment_target_usage',
    ...collectionOverrides
  }
  const attachments = db.collection(collections.attachments)

  function attachmentRefFor(attachmentId) {
    if (typeof attachmentId !== 'string' || !attachmentId || attachmentId.includes('/') || attachmentId.length > 200) {
      throw new HttpError(400, 'Attachment identifier is invalid', 'invalid_attachment_id')
    }
    return attachments.doc(attachmentId)
  }

  async function assertAvailable(userId) {
    if (!await featureFlags.isEnabled('privateAttachmentsV2', userId)) {
      throw new HttpError(404, 'Private attachments are not enabled', 'feature_unavailable')
    }
    assertStorageLimitsConfigured(storageConfig)
    const result = await assertStorageIsolation()
    if (result?.allowed !== true || result?.differsFromBaseline === false) {
      throw new HttpError(503, 'Private attachment storage is not isolated', 'blob_store_not_isolated')
    }
  }

  const access = createStorageAccessAdapter({
    storageProvider,
    mode: readMode,
    authorizeRead: authorizeRead || (({ identity, attachment }) => identity?.userId === attachment?.userId)
  })

  return {
    async createUploadGrant({ identity, key, filename, contentType, size }) {
      const userId = identity?.userId
      if (!userId) throw new HttpError(401, 'Authentication required', 'unauthenticated')
      await assertAvailable(userId)
      const { category } = validateDeclaredFile({ contentType, size, storageConfig })
      const safeFilename = sanitizeFilename(filename)
      const attachmentRef = attachments.doc()
      const pathname = `v2/private/${randomUUID()}`
      const createdAt = now()
      const userUsageRef = db.collection(collections.usage).doc(createHash('sha256').update(userId).digest('hex'))
      const globalUsageRef = db.collection(collections.usage).doc('_global')

      const reserved = await idempotency.run({
        userId,
        operation: 'attachment.create-upload-grant',
        key,
        payload: { filename: safeFilename, contentType, size },
        executeInTransaction: async transaction => {
          const [userUsage, globalUsage] = await Promise.all([
            transaction.get(userUsageRef),
            transaction.get(globalUsageRef)
          ])
          const userBytes = usageBytes(userUsage)
          const globalBytes = usageBytes(globalUsage)
          if (userBytes + size > storageConfig.perUserQuotaBytes) {
            throw new HttpError(413, 'User storage quota exceeded', 'user_quota_exceeded')
          }
          if (globalBytes + size > storageConfig.globalQuotaBytes) {
            throw new HttpError(503, 'Staging storage capacity is unavailable', 'global_quota_exceeded')
          }

          transaction.create(attachmentRef, {
            userId,
            status: 'pending',
            pathname,
            originalFilename: safeFilename,
            declaredContentType: contentType,
            category,
            declaredSize: size,
            checksum: null,
            linkedResourcePath: null,
            cleanupState: 'active',
            version: 1,
            createdAt,
            updatedAt: createdAt,
            expiresAt: new Date(createdAt.getTime() + (storageConfig.pendingUploadTtlMs || 60 * 60 * 1000))
          })
          transaction.set(userUsageRef, { bytes: userBytes + size, updatedAt: createdAt }, { merge: true })
          const nextGlobalBytes = globalBytes + size
          const warningBytes = storageConfig.globalQuotaBytes * storageConfig.globalWarningPercent / 100
          transaction.set(globalUsageRef, {
            bytes: nextGlobalBytes,
            warning: nextGlobalBytes >= warningBytes,
            updatedAt: createdAt
          }, { merge: true })

          return { resourceRef: attachmentRef.path, value: { resourceRef: attachmentRef.path } }
        },
        resolveResult: resourceRef => ({ resourceRef })
      })

      const resultRef = db.doc(reserved.resourceRef)
      const snapshot = await resultRef.get()
      if (!snapshot.exists) throw new HttpError(503, 'Attachment reservation could not be loaded', 'attachment_reservation_missing')
      const attachment = snapshot.data()
      if (attachment.userId !== userId || attachment.status !== 'pending') {
        throw new HttpError(409, 'Attachment is no longer available for upload', 'attachment_state_conflict')
      }

      const validUntil = Math.min(timestampDate(attachment.expiresAt)?.getTime() || 0, now().getTime() + (storageConfig.uploadGrantTtlMs || 5 * 60 * 1000))
      if (validUntil <= now().getTime()) throw new HttpError(410, 'Upload reservation has expired', 'attachment_upload_expired')
      const grant = await storageProvider.createUploadGrant({
        pathname: attachment.pathname,
        contentType: attachment.declaredContentType,
        maximumSizeInBytes: attachment.declaredSize,
        validUntil
      })
      return { attachmentId: refId(reserved.resourceRef), uploadUrl: grant.url, expiresAt: grant.expiresAt, filename: attachment.originalFilename }
    },

    async finalizeUpload({ identity, attachmentId, checksum }) {
      const userId = identity?.userId
      if (!userId) throw new HttpError(401, 'Authentication required', 'unauthenticated')
      await assertAvailable(userId)
      const ref = attachmentRefFor(attachmentId)
      const before = await ref.get()
      if (!before.exists) throw new HttpError(404, 'Attachment not found', 'not_found')
      const attachment = before.data()
      requireV2Owner({ identity, resource: attachment })
      if (attachment.status === 'ready' || attachment.status === 'linked') {
        return { attachmentId, status: attachment.status, checksum: attachment.checksum }
      }
      if (attachment.status !== 'pending' || attachment.cleanupState === 'deleting') {
        throw new HttpError(409, 'Attachment cannot be finalized in its current state', 'attachment_state_conflict')
      }
      if ((timestampDate(attachment.expiresAt)?.getTime() || 0) <= now().getTime()) {
        throw new HttpError(410, 'Upload reservation has expired', 'attachment_upload_expired')
      }

      const inspection = await storageProvider.inspectObject(attachment.pathname)
      if (inspection.size !== attachment.declaredSize) throw new HttpError(422, 'Uploaded file size did not match its reservation', 'file_size_mismatch')
      if (inspection.contentType !== attachment.declaredContentType || inspection.detectedContentType !== attachment.declaredContentType) {
        throw new HttpError(415, 'Uploaded file contents do not match the declared type', 'file_type_mismatch')
      }
      if (checksum && checksum !== inspection.checksum) throw new HttpError(422, 'Uploaded file checksum did not match', 'checksum_mismatch')

      const finalizedAt = now()
      await db.runTransaction(async transaction => {
        const current = await transaction.get(ref)
        if (!current.exists) throw new HttpError(404, 'Attachment not found', 'not_found')
        const state = current.data()
        requireV2Owner({ identity, resource: state })
        if (state.status === 'ready' || state.status === 'linked') return
        if (state.status !== 'pending' || state.cleanupState === 'deleting') {
          throw new HttpError(409, 'Attachment cannot be finalized in its current state', 'attachment_state_conflict')
        }
        transaction.update(ref, {
          status: 'ready',
          actualContentType: inspection.detectedContentType,
          actualSize: inspection.size,
          checksum: inspection.checksum,
          etag: inspection.etag,
          version: state.version + 1,
          updatedAt: finalizedAt
        })
      })
      return { attachmentId, status: 'ready', checksum: inspection.checksum }
    },

    async linkToV2Resource({ identity, attachmentId, targetPath, key }) {
      const userId = identity?.userId
      if (!userId) throw new HttpError(401, 'Authentication required', 'unauthenticated')
      await assertAvailable(userId)
      validateV2TargetPath(targetPath)
      const attachmentRef = attachmentRefFor(attachmentId)
      const targetRef = db.doc(targetPath)
      const linkRef = db.collection(collections.links).doc(attachmentId)
      const targetUsageId = createHash('sha256').update(targetPath).digest('hex')
      const targetUsageRef = db.collection(collections.targetUsage).doc(targetUsageId)
      const linkedAt = now()

      const result = await idempotency.run({
        userId,
        operation: 'attachment.link',
        key,
        payload: { attachmentId, targetPath },
        executeInTransaction: async transaction => {
          const [attachmentSnapshot, targetSnapshot, existingLink, targetUsage] = await Promise.all([
            transaction.get(attachmentRef),
            transaction.get(targetRef),
            transaction.get(linkRef),
            transaction.get(targetUsageRef)
          ])
          if (!attachmentSnapshot.exists || !targetSnapshot.exists) throw new HttpError(404, 'Attachment target not found', 'not_found')
          const attachment = attachmentSnapshot.data()
          const target = targetSnapshot.data()
          requireV2Owner({ identity, resource: attachment })
          requireV2Owner({ identity, resource: target })
          assertV2MutationAllowed(target)
          if (existingLink.exists) {
            if (existingLink.data().targetPath !== targetPath) throw new HttpError(409, 'Attachment is already linked', 'attachment_already_linked')
            return { resourceRef: attachmentRef.path, value: { resourceRef: attachmentRef.path } }
          }
          if (attachment.status !== 'ready' || attachment.cleanupState === 'deleting') {
            throw new HttpError(409, 'Only ready attachments can be linked', 'attachment_state_conflict')
          }
          const currentCount = targetUsage.exists ? targetUsage.data()?.count || 0 : 0
          if (currentCount >= storageConfig.maxAttachmentsPerRecord) {
            throw new HttpError(413, 'Attachment limit for this resource was reached', 'attachment_limit_exceeded')
          }

          transaction.create(linkRef, { userId, attachmentId, targetPath, createdAt: linkedAt })
          transaction.set(targetUsageRef, { count: currentCount + 1, updatedAt: linkedAt }, { merge: true })
          transaction.update(attachmentRef, {
            status: 'linked',
            linkedResourcePath: targetPath,
            cleanupState: 'active',
            version: attachment.version + 1,
            updatedAt: linkedAt
          })
          return { resourceRef: attachmentRef.path, value: { resourceRef: attachmentRef.path } }
        },
        resolveResult: resourceRef => ({ resourceRef })
      })
      return { attachmentId, targetPath, status: 'linked', resourceRef: result.resourceRef }
    },

    async issueReadAccess({ identity, attachmentId }) {
      const userId = identity?.userId
      if (!userId) throw new HttpError(401, 'Authentication required', 'unauthenticated')
      await assertAvailable(userId)
      const snapshot = await attachmentRefFor(attachmentId).get()
      if (!snapshot.exists) throw new HttpError(404, 'Attachment not found', 'not_found')
      const attachment = snapshot.data()
      if (authorizeRead) {
        return access.issueReadAccess({ identity, attachment })
      }
      requireV2Owner({ identity, resource: attachment })
      return access.issueReadAccess({ identity, attachment })
    },

    async openAuthorizedReadStream({ identity, attachmentId }) {
      const userId = identity?.userId
      if (!userId) throw new HttpError(401, 'Authentication required', 'unauthenticated')
      await assertAvailable(userId)
      const snapshot = await attachmentRefFor(attachmentId).get()
      if (!snapshot.exists) throw new HttpError(404, 'Attachment not found', 'not_found')
      const attachment = snapshot.data()
      if (authorizeRead) return access.openAuthorizedStream({ identity, attachment })
      requireV2Owner({ identity, resource: attachment })
      return access.openAuthorizedStream({ identity, attachment })
    },

    async getAttachment(attachmentId) {
      return attachmentRefFor(attachmentId).get()
    }
  }
}
