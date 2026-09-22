import { createHash } from 'node:crypto'
import { FieldPath } from 'firebase-admin/firestore'
import { HttpError } from '../http/http-error.js'
import { assertV2MutationAllowed, requireV2Owner } from '../auth/v2-auth.js'

function hash(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function createCascadeDeletion({ db, idempotency, now = () => new Date(), batchSize = 50, assertStagingOnly = () => true, beforeBatchCommit = async () => {}, collections: collectionOverrides = {} }) {
  if (!db || !idempotency) throw new TypeError('db and idempotency are required')
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 450) throw new TypeError('batchSize must be between 1 and 450')

  const collections = { jobs: 'v2_cascade_jobs', audit: 'v2_audit_log', ...collectionOverrides }
  const audit = db.collection(collections.audit)

  async function requireStaging() {
    if (!await assertStagingOnly()) throw new HttpError(403, 'Cascade deletion is limited to Staging', 'staging_only')
  }

  return {
    async requestDeletion({ identity, rootPath, key }) {
      await requireStaging()
      const userId = identity?.userId
      if (!userId) throw new HttpError(401, 'Authentication required', 'unauthenticated')
      const segments = typeof rootPath === 'string' ? rootPath.split('/') : []
      if (!segments[0]?.startsWith('v2_') || segments.length !== 2) {
        throw new HttpError(400, 'Deletion requests require a V2 resource', 'invalid_deletion_target')
      }

      const rootRef = db.doc(rootPath)
      const jobId = hash(`${userId}\0${rootPath}`)
      const jobRef = db.collection(collections.jobs).doc(jobId)
      const requestedAt = now()
      const result = await idempotency.run({
        userId,
        operation: `cascade.delete:${rootPath}`,
        key,
        payload: { rootPath },
        executeInTransaction: async transaction => {
          const [rootSnapshot, jobSnapshot] = await Promise.all([transaction.get(rootRef), transaction.get(jobRef)])
          if (!rootSnapshot.exists) throw new HttpError(404, 'Resource not found', 'not_found')
          const root = rootSnapshot.data()
          requireV2Owner({ identity, resource: root })
          assertV2MutationAllowed(root)
          if (jobSnapshot.exists) return { resourceRef: jobRef.path, value: { resourceRef: jobRef.path } }
          if ((root.deletionState || 'active') !== 'active') {
            throw new HttpError(409, 'Resource deletion is already in progress', 'deletion_state_conflict')
          }
          if (!Number.isSafeInteger(root.version) || root.version < 0) {
            throw new HttpError(409, 'V2 resource version is missing', 'version_missing')
          }

          transaction.update(rootRef, {
            deletionState: 'tombstoned',
            version: root.version + 1,
            deletionRequestedAt: requestedAt,
            updatedAt: requestedAt
          })
          transaction.create(jobRef, {
            rootPath,
            userId,
            status: 'deletion_requested',
            cursor: null,
            progress: 0,
            batchSize,
            attempts: 0,
            createdAt: requestedAt,
            updatedAt: requestedAt
          })
          transaction.create(audit.doc(`${jobId}_requested`), {
            operation: 'cascade_delete_requested',
            jobId,
            rootPath,
            userId,
            createdAt: requestedAt
          })
          return { resourceRef: jobRef.path, value: { resourceRef: jobRef.path } }
        },
        resolveResult: resourceRef => ({ resourceRef })
      })
      return { jobId, jobPath: result.resourceRef, status: 'deletion_requested' }
    },

    async processNextBatch(jobId) {
      await requireStaging()
      if (typeof jobId !== 'string' || !/^[a-f0-9]{64}$/.test(jobId)) throw new HttpError(400, 'Deletion job identifier is invalid', 'invalid_job_id')
      const jobRef = db.collection(collections.jobs).doc(jobId)
      const updatedAt = now()
      try {
        return await db.runTransaction(async transaction => {
          const jobSnapshot = await transaction.get(jobRef)
          if (!jobSnapshot.exists) throw new HttpError(404, 'Deletion job not found', 'not_found')
          const job = jobSnapshot.data()
          const rootRef = db.doc(job.rootPath)
          const rootSnapshot = await transaction.get(rootRef)
          if (!rootSnapshot.exists) throw new HttpError(404, 'Deletion root not found', 'not_found')
          if (job.status === 'completed') return { status: 'completed', progress: job.progress, cursor: job.cursor }

          const items = jobRef.collection('items')
          let query = items.orderBy(FieldPath.documentId()).limit(Math.min(job.batchSize || batchSize, batchSize))
          if (job.cursor) query = query.startAfter(job.cursor)
          const work = await transaction.get(query)
          await beforeBatchCommit({ job, batch: work.docs.map(doc => doc.id) })

          for (const item of work.docs) transaction.delete(item.ref)
          const lastId = work.docs.at(-1)?.id || job.cursor || null
          const progress = (job.progress || 0) + work.size
          const completed = work.size < Math.min(job.batchSize || batchSize, batchSize)
          const status = completed ? 'completed' : 'deleting'
          const auditId = `${jobId}_${hash(lastId || 'empty').slice(0, 20)}`

          transaction.update(jobRef, {
            status,
            cursor: lastId,
            progress,
            attempts: (job.attempts || 0) + 1,
            lastErrorCode: null,
            updatedAt
          })
          transaction.update(rootRef, {
            deletionState: completed ? 'completed' : 'deleting',
            deletionProgress: progress,
            updatedAt
          })
          transaction.set(audit.doc(auditId), {
            operation: 'cascade_delete_batch',
            jobId,
            result: status,
            deletedCount: work.size,
            cursor: lastId,
            createdAt: updatedAt
          }, { merge: true })
          return { status, progress, cursor: lastId, deletedCount: work.size }
        })
      } catch (error) {
        const failedAt = now()
        await db.runTransaction(async transaction => {
          const jobSnapshot = await transaction.get(jobRef)
          if (!jobSnapshot.exists || jobSnapshot.data()?.status === 'completed') return
          const job = jobSnapshot.data()
          const rootRef = db.doc(job.rootPath)
          const rootSnapshot = await transaction.get(rootRef)
          if (!rootSnapshot.exists) return
          transaction.update(jobRef, {
            status: 'failed',
            attempts: (job.attempts || 0) + 1,
            lastErrorCode: typeof error?.code === 'string' ? error.code : 'cascade_batch_failed',
            updatedAt: failedAt
          })
          transaction.update(rootRef, { deletionState: 'failed', updatedAt: failedAt })
          transaction.set(audit.doc(`${jobId}_failed`), {
            operation: 'cascade_delete_failed',
            jobId,
            result: 'failed',
            createdAt: failedAt
          }, { merge: true })
        })
        throw error
      }
    },

    async resume(jobId) {
      await requireStaging()
      if (typeof jobId !== 'string' || !/^[a-f0-9]{64}$/.test(jobId)) throw new HttpError(400, 'Deletion job identifier is invalid', 'invalid_job_id')
      const jobRef = db.collection(collections.jobs).doc(jobId)
      const resumedAt = now()
      await db.runTransaction(async transaction => {
        const jobSnapshot = await transaction.get(jobRef)
        if (!jobSnapshot.exists) throw new HttpError(404, 'Deletion job not found', 'not_found')
        const job = jobSnapshot.data()
        if (job.status === 'completed') return
        const rootRef = db.doc(job.rootPath)
        const rootSnapshot = await transaction.get(rootRef)
        if (!rootSnapshot.exists) throw new HttpError(404, 'Deletion root not found', 'not_found')
        transaction.update(jobRef, { status: 'deleting', lastErrorCode: null, updatedAt: resumedAt })
        transaction.update(rootRef, { deletionState: 'deleting', updatedAt: resumedAt })
        transaction.set(audit.doc(`${jobId}_resumed`), {
          operation: 'cascade_delete_resumed',
          jobId,
          createdAt: resumedAt
        }, { merge: true })
      })
      return this.processNextBatch(jobId)
    },

    async getJob(jobId) {
      if (typeof jobId !== 'string' || !/^[a-f0-9]{64}$/.test(jobId)) throw new HttpError(400, 'Deletion job identifier is invalid', 'invalid_job_id')
      return db.collection(collections.jobs).doc(jobId).get()
    }
  }
}
