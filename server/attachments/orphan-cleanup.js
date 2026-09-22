import { randomUUID, createHash } from 'node:crypto'
import { FieldPath } from 'firebase-admin/firestore'
import { HttpError } from '../http/http-error.js'

function asDate(value) {
  return value?.toDate?.() || (value instanceof Date ? value : null)
}

function quotaDocumentId(userId) {
  return createHash('sha256').update(userId).digest('hex')
}

export function createOrphanCleanup({
  db,
  storageProvider,
  gracePeriodMs,
  batchSize,
  globalQuotaBytes,
  globalWarningPercent,
  now = () => new Date(),
  leaseMs = 10 * 60 * 1000,
  assertStagingIsolation = () => storageProvider.verifyIsolation(),
  collections: collectionOverrides = {}
}) {
  if (!db || !storageProvider) throw new TypeError('db and storageProvider are required')
  if (!Number.isSafeInteger(gracePeriodMs) || gracePeriodMs < 1) {
    throw new HttpError(503, 'Orphan cleanup grace period is not configured', 'orphan_cleanup_not_configured')
  }
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 450) {
    throw new HttpError(503, 'Orphan cleanup batch size is not configured', 'orphan_cleanup_not_configured')
  }

  const collections = {
    attachments: 'v2_attachments',
    cursors: 'v2_orphan_cleanup_cursors',
    links: 'v2_attachment_links',
    usage: 'v2_attachment_usage',
    audit: 'v2_audit_log',
    ...collectionOverrides
  }
  const attachments = db.collection(collections.attachments)
  const cursors = db.collection(collections.cursors)
  const links = db.collection(collections.links)
  const audit = db.collection(collections.audit)

  async function cleanOne(candidate) {
    const ref = attachments.doc(candidate.id)
    const linkRef = links.doc(candidate.id)
    const token = randomUUID()
    const claimAt = now()

    const claim = await db.runTransaction(async transaction => {
      const [snapshot, linkSnapshot] = await Promise.all([transaction.get(ref), transaction.get(linkRef)])
      if (!snapshot.exists || linkSnapshot.exists) return { claimed: false, reason: 'referenced-or-missing' }
      const attachment = snapshot.data()
      if (attachment.status === 'linked' || !['pending', 'ready'].includes(attachment.status)) {
        return { claimed: false, reason: 'not-orphan-candidate' }
      }
      const updatedAt = asDate(attachment.updatedAt) || asDate(attachment.createdAt)
      if (!updatedAt || updatedAt.getTime() + gracePeriodMs > claimAt.getTime()) {
        return { claimed: false, reason: 'grace-period' }
      }
      const leaseUntil = asDate(attachment.cleanupLeaseUntil)
      if (attachment.cleanupState === 'deleting' && leaseUntil && leaseUntil.getTime() > claimAt.getTime()) {
        return { claimed: false, reason: 'claimed' }
      }

      transaction.update(ref, {
        cleanupState: 'deleting',
        cleanupToken: token,
        cleanupLeaseUntil: new Date(claimAt.getTime() + leaseMs),
        updatedAt: claimAt
      })
      return { claimed: true, pathname: attachment.pathname, userId: attachment.userId, size: attachment.actualSize || attachment.declaredSize, etag: attachment.etag || null }
    })
    if (!claim.claimed) return claim

    // Recheck the attachment and its link marker immediately before external deletion.
    const safeToDelete = await db.runTransaction(async transaction => {
      const [snapshot, linkSnapshot] = await Promise.all([transaction.get(ref), transaction.get(linkRef)])
      if (!snapshot.exists || linkSnapshot.exists) return false
      const current = snapshot.data()
      return current.cleanupState === 'deleting'
        && current.cleanupToken === token
        && ['pending', 'ready'].includes(current.status)
        && current.linkedResourcePath == null
    })
    if (!safeToDelete) return { claimed: false, reason: 'reference-recheck-failed' }

    try {
      await storageProvider.removeObject(claim.pathname, { etag: claim.etag })
    } catch (error) {
      const failedAt = now()
      await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref)
        if (!snapshot.exists || snapshot.data()?.cleanupToken !== token) return
        transaction.update(ref, {
          cleanupState: 'failed-retryable',
          cleanupToken: null,
          cleanupLeaseUntil: null,
          lastCleanupErrorCode: typeof error?.code === 'string' ? error.code : 'storage_delete_failed',
          updatedAt: failedAt
        })
        transaction.set(audit.doc(`${candidate.id}_orphan_cleanup`), {
          operation: 'orphan_cleanup',
          attachmentId: candidate.id,
          result: 'failed-retryable',
          createdAt: failedAt
        }, { merge: true })
      })
      return { claimed: true, deleted: false, reason: 'storage-delete-failed' }
    }

    const deletedAt = now()
    const userUsageRef = db.collection(collections.usage).doc(quotaDocumentId(claim.userId))
    const globalUsageRef = db.collection(collections.usage).doc('_global')
    await db.runTransaction(async transaction => {
      const [snapshot, linkSnapshot, userUsage, globalUsage] = await Promise.all([
        transaction.get(ref),
        transaction.get(linkRef),
        transaction.get(userUsageRef),
        transaction.get(globalUsageRef)
      ])
      if (!snapshot.exists || linkSnapshot.exists) throw new HttpError(409, 'Attachment became referenced during cleanup', 'orphan_cleanup_reference_race')
      const attachment = snapshot.data()
      if (attachment.cleanupToken !== token || attachment.cleanupState !== 'deleting' || !['pending', 'ready'].includes(attachment.status)) {
        throw new HttpError(409, 'Attachment cleanup claim was lost', 'orphan_cleanup_claim_lost')
      }
      const bytes = claim.size || 0
      const nextUserBytes = Math.max(0, (userUsage.data()?.bytes || 0) - bytes)
      const nextGlobalBytes = Math.max(0, (globalUsage.data()?.bytes || 0) - bytes)
      const warning = Number.isSafeInteger(globalQuotaBytes) && Number.isSafeInteger(globalWarningPercent)
        ? nextGlobalBytes >= globalQuotaBytes * globalWarningPercent / 100
        : Boolean(globalUsage.data()?.warning)
      transaction.update(ref, {
        status: 'orphan_deleted',
        cleanupState: 'completed',
        cleanupToken: null,
        cleanupLeaseUntil: null,
        deletedAt,
        version: (attachment.version || 0) + 1,
        updatedAt: deletedAt
      })
      transaction.set(userUsageRef, { bytes: nextUserBytes, updatedAt: deletedAt }, { merge: true })
      transaction.set(globalUsageRef, { bytes: nextGlobalBytes, updatedAt: deletedAt, warning }, { merge: true })
      transaction.set(audit.doc(`${candidate.id}_orphan_cleanup`), {
        operation: 'orphan_cleanup',
        attachmentId: candidate.id,
        result: 'deleted',
        createdAt: deletedAt
      }, { merge: true })
    })
    return { claimed: true, deleted: true }
  }

  return {
    async runBatch() {
      const isolation = await assertStagingIsolation()
      if (isolation?.allowed !== true || isolation?.differsFromBaseline === false) {
        throw new HttpError(503, 'Orphan cleanup requires isolated Staging storage', 'blob_store_not_isolated')
      }
      const cutoff = new Date(now().getTime() - gracePeriodMs)
      const results = []
      let scanned = 0

      for (const status of ['pending', 'ready']) {
        const cursorRef = cursors.doc(status)
        const cursorSnapshot = await cursorRef.get()
        const cursor = cursorSnapshot.exists ? cursorSnapshot.data()?.lastScannedId || null : null
        let query = attachments.where('status', '==', status).orderBy(FieldPath.documentId()).limit(batchSize)
        if (cursor) query = query.startAfter(cursor)
        const snapshot = await query.get()
        const candidates = snapshot.docs.map(document => ({ id: document.id, ...document.data() }))
        scanned += candidates.length

        for (const candidate of candidates) {
          const updatedAt = asDate(candidate.updatedAt) || asDate(candidate.createdAt)
          if (!updatedAt || updatedAt > cutoff) continue
          results.push({ id: candidate.id, ...(await cleanOne(candidate)) })
        }

        const nextCursor = snapshot.docs.length === batchSize ? snapshot.docs.at(-1).id : null
        const scannedAt = now()
        await db.runTransaction(async transaction => {
          const current = await transaction.get(cursorRef)
          const currentCursor = current.exists ? current.data()?.lastScannedId || null : null
          if (currentCursor === cursor) {
            transaction.set(cursorRef, {
              lastScannedId: nextCursor,
              updatedAt: scannedAt
            }, { merge: true })
          }
        })
      }

      return { scanned, examined: results.length, results }
    }
  }
}
