import { HttpError } from '../http/http-error.js'

export async function mutateVersioned({ db, ref, expectedVersion, mutate, now = () => new Date() }) {
  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0) {
    throw new HttpError(400, 'expectedVersion must be a non-negative integer', 'invalid_expected_version')
  }
  if (typeof mutate !== 'function') throw new TypeError('mutate is required')

  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists) throw new HttpError(404, 'Resource not found', 'not_found')
    const current = snapshot.data()
    if (!Number.isSafeInteger(current.version) || current.version < 0) {
      throw new HttpError(409, 'Resource does not have a valid V2 version', 'version_missing')
    }
    if (current.version !== expectedVersion) {
      throw new HttpError(409, 'Resource was changed by another request', 'version_conflict')
    }
    if (current.deletionState && current.deletionState !== 'active') {
      throw new HttpError(409, 'Resource is pending deletion', 'resource_tombstoned')
    }

    const patch = await mutate(current, transaction)
    if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
      throw new TypeError('mutate must return a document patch')
    }
    const next = { ...patch, version: current.version + 1, updatedAt: now() }
    transaction.update(ref, next)
    return { ...current, ...next }
  })
}
