import { createHash, randomUUID } from 'node:crypto'
import { HttpError } from '../http/http-error.js'

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]))
  }
  return value
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function hashRequestPayload(payload) {
  return digest(JSON.stringify(stableValue(payload)))
}

export function idempotencyDocumentId({ userId, operation, key }) {
  return digest(`${userId}\0${operation}\0${key}`)
}

function validateInputs({ userId, operation, key, payload, executeInTransaction }) {
  if (!userId || !operation || !key || typeof key !== 'string' || key.length > 200) {
    throw new HttpError(400, 'A valid Idempotency-Key is required', 'invalid_idempotency_key')
  }
  if (typeof executeInTransaction !== 'function') throw new TypeError('executeInTransaction is required')
  if (payload === undefined) throw new HttpError(400, 'Idempotent payload is required', 'invalid_payload')
}

/**
 * Executes an idempotent Firestore-only operation. executeInTransaction must
 * perform no external I/O; its writes and the completed key commit atomically.
 */
export function createFirestoreIdempotency({
  db,
  collectionName = 'v2_idempotency',
  now = () => new Date(),
  ttlMs = 24 * 60 * 60 * 1000,
  processingLeaseMs = 2 * 60 * 1000
}) {
  if (!db || typeof db.runTransaction !== 'function') throw new TypeError('Firestore db is required')

  return {
    async run({ userId, operation, key, payload, executeInTransaction, resolveResult }) {
      validateInputs({ userId, operation, key, payload, executeInTransaction })
      const requestHash = hashRequestPayload(payload)
      const ref = db.collection(collectionName).doc(idempotencyDocumentId({ userId, operation, key }))
      const leaseToken = randomUUID()
      const reserveAt = now()
      const expiresAt = new Date(reserveAt.getTime() + ttlMs)

      const reservation = await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref)
        const stored = snapshot.exists ? snapshot.data() : null
        const isExpired = stored?.expiresAt?.toDate
          ? stored.expiresAt.toDate().getTime() <= reserveAt.getTime()
          : stored?.expiresAt instanceof Date && stored.expiresAt.getTime() <= reserveAt.getTime()

        if (!stored || isExpired) {
          transaction.set(ref, {
            userId,
            operation,
            requestHash,
            status: 'processing',
            resourceRef: null,
            createdAt: reserveAt,
            updatedAt: reserveAt,
            expiresAt,
            leaseToken,
            leaseUntil: new Date(reserveAt.getTime() + processingLeaseMs)
          })
          return { owner: true }
        }

        if (stored.requestHash !== requestHash) {
          throw new HttpError(409, 'Idempotency-Key was already used with a different request', 'idempotency_conflict')
        }
        if (stored.status === 'completed') return { owner: false, completed: true, resourceRef: stored.resourceRef }

        const leaseUntil = stored.leaseUntil?.toDate?.() || stored.leaseUntil
        const leaseExpired = leaseUntil instanceof Date && leaseUntil.getTime() <= reserveAt.getTime()
        if (stored.status === 'failed-retryable' || (stored.status === 'processing' && leaseExpired)) {
          transaction.update(ref, {
            status: 'processing',
            updatedAt: reserveAt,
            leaseToken,
            leaseUntil: new Date(reserveAt.getTime() + processingLeaseMs)
          })
          return { owner: true }
        }

        return { owner: false, processing: true }
      })

      if (!reservation.owner) {
        if (reservation.completed) {
          return typeof resolveResult === 'function'
            ? resolveResult(reservation.resourceRef)
            : { resourceRef: reservation.resourceRef, replayed: true }
        }
        throw new HttpError(409, 'A matching request is still processing; retry with the same key', 'idempotency_in_progress')
      }

      try {
        const result = await db.runTransaction(async transaction => {
          const snapshot = await transaction.get(ref)
          const stored = snapshot.data()
          if (!snapshot.exists || stored?.status !== 'processing' || stored.leaseToken !== leaseToken) {
            throw new HttpError(409, 'Idempotency reservation is no longer active', 'idempotency_lease_lost')
          }

          const operationResult = await executeInTransaction(transaction)
          if (!operationResult?.resourceRef || typeof operationResult.resourceRef !== 'string') {
            throw new TypeError('executeInTransaction must return a resourceRef')
          }
          transaction.update(ref, {
            status: 'completed',
            resourceRef: operationResult.resourceRef,
            updatedAt: now(),
            completedAt: now(),
            leaseToken: null,
            leaseUntil: null
          })
          return operationResult
        })
        return result.value === undefined ? { resourceRef: result.resourceRef } : result.value
      } catch (error) {
        const failedAt = now()
        try {
          await db.runTransaction(async transaction => {
            const snapshot = await transaction.get(ref)
            if (snapshot.exists && snapshot.data()?.leaseToken === leaseToken) {
              transaction.update(ref, {
                status: 'failed-retryable',
                updatedAt: failedAt,
                lastFailureCode: typeof error?.code === 'string' ? error.code : 'operation_failed',
                leaseToken: null,
                leaseUntil: null
              })
            }
          })
        } catch {
          // Keep the original operation error; a lease timeout allows safe retry.
        }
        throw error
      }
    }
  }
}
