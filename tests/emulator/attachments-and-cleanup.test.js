import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createEmulatorDatabase, testNamespace } from './emulator-db.js'
import { createFirestoreIdempotency } from '../../server/domain/idempotency.js'
import { createAttachmentLifecycle } from '../../server/attachments/attachment-lifecycle.js'
import { createOrphanCleanup } from '../../server/attachments/orphan-cleanup.js'

const limits = {
  maxImageBytes: 2_000_000,
  maxPdfBytes: 8_000_000,
  maxAttachmentsPerRecord: 1,
  perUserQuotaBytes: 25_000_000,
  globalQuotaBytes: 100_000_000,
  globalWarningPercent: 80,
  pendingUploadTtlMs: 60 * 60 * 1000,
  uploadGrantTtlMs: 5 * 60 * 1000
}

describe('Firestore V2 attachment lifecycle and orphan cleanup', () => {
  let db
  let close

  beforeAll(async () => {
    const emulator = await createEmulatorDatabase()
    db = emulator.db
    close = emulator.close
  })

  afterAll(async () => close?.())

  function createHarness({ storageOverrides = {}, readMode = 'signed-url', authorizeRead, now = () => new Date() } = {}) {
    const namespace = testNamespace()
    const collections = {
      attachments: `${namespace}_attachments`,
      usage: `${namespace}_usage`,
      links: `${namespace}_links`,
      targetUsage: `${namespace}_target_usage`,
      cursors: `${namespace}_cleanup_cursors`,
      audit: `${namespace}_audit`
    }
    const idempotency = createFirestoreIdempotency({ db, collectionName: `${namespace}_idempotency`, now })
    const storage = {
      verifyIsolation: () => ({ allowed: true, differsFromBaseline: true }),
      createUploadGrant: async ({ pathname, validUntil }) => ({ url: `https://staging.invalid/${pathname}`, expiresAt: new Date(validUntil) }),
      inspectObject: async () => ({
        size: 12,
        contentType: 'image/png',
        detectedContentType: 'image/png',
        checksum: 'sha256-test-checksum',
        etag: 'etag-test'
      }),
      createReadGrant: async ({ validUntil }) => ({ url: 'https://staging.invalid/private-read', expiresAt: new Date(validUntil) }),
      streamObject: async () => ({ stream: 'synthetic-stream' }),
      removeObject: async () => ({ deleted: true }),
      ...storageOverrides
    }
    const lifecycle = createAttachmentLifecycle({
      db,
      idempotency,
      storageProvider: storage,
      storageConfig: limits,
      featureFlags: { isEnabled: async key => key === 'privateAttachmentsV2' },
      assertStorageIsolation: () => ({ allowed: true, differsFromBaseline: true }),
      now,
      readMode,
      authorizeRead,
      collections
    })
    return { namespace, collections, idempotency, storage, lifecycle }
  }

  it('keeps an attachment pending until server inspection passes, then transitions ready -> linked', async () => {
    const { namespace, collections, lifecycle, storage } = createHarness()
    const identity = { userId: `synthetic-user-${namespace}` }
    const targetRef = db.collection(`v2_synthetic_targets_${namespace}`).doc('target-one')
    await targetRef.create({ userId: identity.userId, version: 0 })

    const grant = await lifecycle.createUploadGrant({
      identity, key: 'upload-key', filename: '../../receipt.png', contentType: 'image/png', size: 12
    })
    const attachmentRef = db.collection(collections.attachments).doc(grant.attachmentId)
    expect((await attachmentRef.get()).data()).toMatchObject({ status: 'pending', version: 1, originalFilename: 'receipt.png' })

    const duplicate = await lifecycle.createUploadGrant({
      identity, key: 'upload-key', filename: '../../receipt.png', contentType: 'image/png', size: 12
    })
    expect(duplicate.attachmentId).toBe(grant.attachmentId)
    expect(storage.createUploadGrant).toBeDefined()

    storage.inspectObject = async () => ({
      size: 12,
      contentType: 'image/png',
      detectedContentType: 'application/pdf',
      checksum: 'bad-checksum',
      etag: 'etag-test'
    })
    await expect(lifecycle.finalizeUpload({ identity, attachmentId: grant.attachmentId }))
      .rejects.toMatchObject({ status: 415, code: 'file_type_mismatch' })
    expect((await attachmentRef.get()).data().status).toBe('pending')

    storage.inspectObject = async () => ({
      size: 12,
      contentType: 'image/png',
      detectedContentType: 'image/png',
      checksum: 'sha256-test-checksum',
      etag: 'etag-test'
    })
    await expect(lifecycle.finalizeUpload({ identity, attachmentId: grant.attachmentId, checksum: 'wrong' }))
      .rejects.toMatchObject({ status: 422, code: 'checksum_mismatch' })
    const ready = await lifecycle.finalizeUpload({ identity, attachmentId: grant.attachmentId })
    expect(ready.status).toBe('ready')
    expect((await attachmentRef.get()).data().checksum).toBe('sha256-test-checksum')

    const linked = await lifecycle.linkToV2Resource({
      identity, attachmentId: grant.attachmentId, targetPath: targetRef.path, key: 'link-key'
    })
    expect(linked.status).toBe('linked')
    expect((await attachmentRef.get()).data().linkedResourcePath).toBe(targetRef.path)
    expect((await db.collection(collections.links).doc(grant.attachmentId).get()).exists).toBe(true)
    const replay = await lifecycle.linkToV2Resource({
      identity, attachmentId: grant.attachmentId, targetPath: targetRef.path, key: 'link-key'
    })
    expect(replay.status).toBe('linked')

    const tombstonedTarget = db.collection(`v2_synthetic_targets_${namespace}`).doc('tombstoned-target')
    await tombstonedTarget.create({ userId: identity.userId, version: 0, deletionState: 'tombstoned' })
    const secondGrant = await lifecycle.createUploadGrant({
      identity, key: 'second-upload-key', filename: 'second.png', contentType: 'image/png', size: 12
    })
    await lifecycle.finalizeUpload({ identity, attachmentId: secondGrant.attachmentId })
    await expect(lifecycle.linkToV2Resource({
      identity, attachmentId: secondGrant.attachmentId, targetPath: tombstonedTarget.path, key: 'tombstoned-link-key'
    })).rejects.toMatchObject({ status: 409, code: 'resource_tombstoned' })
  })

  it('requires ownership for signed access and differentiates signed URLs from per-request proxy authorization', async () => {
    const ownerHarness = createHarness()
    const owner = { userId: `owner-${ownerHarness.namespace}` }
    const grant = await ownerHarness.lifecycle.createUploadGrant({
      identity: owner, key: 'read-upload', filename: 'receipt.png', contentType: 'image/png', size: 12
    })
    await ownerHarness.lifecycle.finalizeUpload({ identity: owner, attachmentId: grant.attachmentId })
    const read = await ownerHarness.lifecycle.issueReadAccess({ identity: owner, attachmentId: grant.attachmentId })
    expect(read).toMatchObject({ mode: 'signed-url', immediateRevocation: false, rechecksAuthorizationPerRequest: false })
    await expect(ownerHarness.lifecycle.issueReadAccess({ identity: { userId: 'other-user' }, attachmentId: grant.attachmentId }))
      .rejects.toMatchObject({ status: 403 })

    let allowed = true
    const proxyHarness = createHarness({
      readMode: 'authorization-proxy',
      authorizeRead: async () => allowed,
      storageOverrides: { streamObject: async () => ({ stream: 'authorized-stream' }) }
    })
    const proxyOwner = { userId: `proxy-owner-${proxyHarness.namespace}` }
    const proxyGrant = await proxyHarness.lifecycle.createUploadGrant({
      identity: proxyOwner, key: 'proxy-upload', filename: 'receipt.png', contentType: 'image/png', size: 12
    })
    await proxyHarness.lifecycle.finalizeUpload({ identity: proxyOwner, attachmentId: proxyGrant.attachmentId })
    expect(await proxyHarness.lifecycle.issueReadAccess({ identity: { userId: 'shared-recipient' }, attachmentId: proxyGrant.attachmentId }))
      .toMatchObject({ mode: 'authorization-proxy', rechecksAuthorizationPerRequest: true, permissionChangesApplyOnNextRequest: true })
    allowed = false
    await expect(proxyHarness.lifecycle.openAuthorizedReadStream({ identity: { userId: 'shared-recipient' }, attachmentId: proxyGrant.attachmentId }))
      .rejects.toMatchObject({ status: 403 })
  })

  it('rechecks a cleanup claim before deletion and rejects a concurrent link while cleanup owns the attachment', async () => {
    let lifecycle
    let grant
    let linkWasRejected = false
    const harness = createHarness({ storageOverrides: {
      removeObject: async () => {
        try {
          await lifecycle.linkToV2Resource({
            identity: { userId: `cleanup-user-${harness.namespace}` },
            attachmentId: grant.attachmentId,
            targetPath: targetRef.path,
            key: 'racing-link-key'
          })
        } catch (error) {
          linkWasRejected = error.code === 'attachment_state_conflict'
        }
        return { deleted: true }
      }
    } })
    const identity = { userId: `cleanup-user-${harness.namespace}` }
    const targetRef = db.collection(`v2_synthetic_targets_${harness.namespace}`).doc('target-race')
    await targetRef.create({ userId: identity.userId, version: 0 })
    grant = await harness.lifecycle.createUploadGrant({
      identity, key: 'orphan-upload', filename: 'orphan.png', contentType: 'image/png', size: 12
    })
    lifecycle = harness.lifecycle
    await harness.lifecycle.finalizeUpload({ identity, attachmentId: grant.attachmentId })
    const oldDate = new Date(Date.now() - 60_000)
    await db.collection(harness.collections.attachments).doc(grant.attachmentId).update({ updatedAt: oldDate })

    const cleanup = createOrphanCleanup({
      db,
      storageProvider: harness.storage,
      gracePeriodMs: 1000,
      batchSize: 25,
      now: () => new Date(),
      globalQuotaBytes: limits.globalQuotaBytes,
      globalWarningPercent: limits.globalWarningPercent,
      assertStagingIsolation: () => ({ allowed: true, differsFromBaseline: true }),
      collections: {
        attachments: harness.collections.attachments,
        cursors: harness.collections.cursors,
        links: harness.collections.links,
        usage: harness.collections.usage,
        audit: harness.collections.audit
      }
    })
    const result = await cleanup.runBatch()
    const stored = (await db.collection(harness.collections.attachments).doc(grant.attachmentId).get()).data()
    expect(result.results.some(item => item.id === grant.attachmentId && item.deleted)).toBe(true)
    expect(linkWasRejected).toBe(true)
    expect(stored).toMatchObject({ status: 'orphan_deleted', cleanupState: 'completed' })
    expect((await db.collection(harness.collections.links).doc(grant.attachmentId).get()).exists).toBe(false)
    expect((await db.collection(harness.collections.audit).doc(`${grant.attachmentId}_orphan_cleanup`).get()).data().result).toBe('deleted')
  })
})
