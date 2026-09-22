import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createEmulatorDatabase, testNamespace } from './emulator-db.js'
import { createFirestoreIdempotency } from '../../server/domain/idempotency.js'
import { createCascadeDeletion } from '../../server/domain/cascade-deletion.js'
import { assertV2MutationAllowed } from '../../server/auth/v2-auth.js'

describe('Staging V2 cascade deletion', () => {
  let db
  let close

  beforeAll(async () => {
    const emulator = await createEmulatorDatabase()
    db = emulator.db
    close = emulator.close
  })

  afterAll(async () => close?.())

  it('tombstones once, blocks new mutations, and resumes bounded batches after interruption', async () => {
    const namespace = testNamespace()
    const rootRef = db.collection(`v2_roots_${namespace}`).doc('synthetic-root')
    await rootRef.create({ userId: 'synthetic-staging-user', version: 1, deletionState: 'active' })
    let interruptNextBatch = false
    const service = createCascadeDeletion({
      db,
      idempotency: createFirestoreIdempotency({ db, collectionName: `${namespace}_idempotency` }),
      batchSize: 3,
      assertStagingOnly: async () => true,
      beforeBatchCommit: async () => {
        if (!interruptNextBatch) return
        interruptNextBatch = false
        throw Object.assign(new Error('synthetic interruption'), { code: 'synthetic_interruption' })
      },
      collections: { jobs: `${namespace}_jobs`, audit: `${namespace}_audit` }
    })

    const request = await service.requestDeletion({
      identity: { userId: 'synthetic-staging-user' }, rootPath: rootRef.path, key: 'delete-root-key'
    })
    expect(request.status).toBe('deletion_requested')
    const tombstonedRoot = (await rootRef.get()).data()
    expect(tombstonedRoot.deletionState).toBe('tombstoned')
    expect(() => assertV2MutationAllowed(tombstonedRoot)).toThrowError()

    const sameRequest = await service.requestDeletion({
      identity: { userId: 'synthetic-staging-user' }, rootPath: rootRef.path, key: 'delete-root-key'
    })
    expect(sameRequest.jobId).toBe(request.jobId)

    const itemCollection = db.collection(`${namespace}_jobs`).doc(request.jobId).collection('items')
    for (let index = 1; index <= 7; index += 1) {
      await itemCollection.doc(`item-${String(index).padStart(2, '0')}`).create({ value: index })
    }

    const firstBatch = await service.processNextBatch(request.jobId)
    expect(firstBatch).toMatchObject({ status: 'deleting', progress: 3, deletedCount: 3 })
    interruptNextBatch = true
    await expect(service.processNextBatch(request.jobId)).rejects.toMatchObject({ code: 'synthetic_interruption' })
    expect((await service.getJob(request.jobId)).data().status).toBe('failed')
    expect((await rootRef.get()).data().deletionState).toBe('failed')

    let progress = (await service.resume(request.jobId)).progress
    while ((await service.getJob(request.jobId)).data().status !== 'completed') {
      progress = (await service.processNextBatch(request.jobId)).progress
    }
    const job = (await service.getJob(request.jobId)).data()
    const root = (await rootRef.get()).data()
    const remaining = await itemCollection.get()
    expect(progress).toBe(7)
    expect(job).toMatchObject({ status: 'completed', progress: 7 })
    expect(root.deletionState).toBe('completed')
    expect(remaining.size).toBe(0)
    expect((await db.collection(`${namespace}_audit`).get()).size).toBeGreaterThanOrEqual(3)
  })

  it('rejects ownership mismatches and any execution outside the explicit Staging guard', async () => {
    const namespace = testNamespace()
    const rootRef = db.collection(`v2_roots_${namespace}`).doc('not-owned')
    await rootRef.create({ userId: 'actual-owner', version: 1, deletionState: 'active' })
    const service = createCascadeDeletion({
      db,
      idempotency: createFirestoreIdempotency({ db, collectionName: `${namespace}_idempotency` }),
      assertStagingOnly: async () => false,
      collections: { jobs: `${namespace}_jobs`, audit: `${namespace}_audit` }
    })
    await expect(service.requestDeletion({ identity: { userId: 'different-user' }, rootPath: rootRef.path, key: 'k' }))
      .rejects.toMatchObject({ code: 'staging_only' })
    expect((await rootRef.get()).data().deletionState).toBe('active')
  })
})
