import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createEmulatorDatabase, testNamespace } from './emulator-db.js'
import { createFirestoreIdempotency } from '../../server/domain/idempotency.js'
import { mutateVersioned } from '../../server/domain/versioned-mutation.js'

describe('Firestore V2 idempotency and optimistic concurrency', () => {
  let db
  let close

  beforeAll(async () => {
    const emulator = await createEmulatorDatabase()
    db = emulator.db
    close = emulator.close
  })

  afterAll(async () => close?.())

  it('serializes concurrent duplicate requests and persists only a result reference', async () => {
    const namespace = testNamespace()
    const idempotency = createFirestoreIdempotency({ db, collectionName: `${namespace}_idempotency` })
    const effects = db.collection(`${namespace}_effects`)
    let releaseExecute
    let signalEntered
    const entered = new Promise(resolve => { signalEntered = resolve })
    const gate = new Promise(resolve => { releaseExecute = resolve })
    let executions = 0

    const invoke = () => idempotency.run({
      userId: 'synthetic-staging-user',
      operation: 'synthetic.create',
      key: 'concurrent-key-1',
      payload: { value: 9, nested: { z: 1, a: 2 } },
      executeInTransaction: async transaction => {
        executions += 1
        signalEntered()
        await gate
        transaction.create(effects.doc('one-resource'), { value: 9 })
        return { resourceRef: `${namespace}_effects/one-resource`, value: { id: 'one-resource' } }
      },
      resolveResult: resourceRef => ({ resourceRef })
    })

    const first = invoke()
    await entered
    const concurrent = Array.from({ length: 12 }, () => invoke())
    await Promise.resolve()
    releaseExecute()
    const outcomes = await Promise.allSettled([first, ...concurrent])
    const effectSnapshot = await effects.get()
    const keySnapshot = await db.collection(`${namespace}_idempotency`).get()
    const stored = keySnapshot.docs[0].data()

    expect(executions).toBe(1)
    expect(effectSnapshot.size).toBe(1)
    expect(stored).toMatchObject({ status: 'completed', userId: 'synthetic-staging-user', operation: 'synthetic.create' })
    expect(stored.requestHash).toMatch(/^[a-f0-9]{64}$/)
    expect(stored.resourceRef).toBe(`${namespace}_effects/one-resource`)
    expect(stored.expiresAt).toBeTruthy()
    expect(stored).not.toHaveProperty('response')
    expect(stored).not.toHaveProperty('payload')
    expect(outcomes.some(outcome => outcome.status === 'fulfilled')).toBe(true)

    const replay = await idempotency.run({
      userId: 'synthetic-staging-user',
      operation: 'synthetic.create',
      key: 'concurrent-key-1',
      payload: { nested: { a: 2, z: 1 }, value: 9 },
      executeInTransaction: async () => { throw new Error('completed request should not execute again') },
      resolveResult: resourceRef => ({ resourceRef })
    })
    expect(replay).toEqual({ resourceRef: `${namespace}_effects/one-resource` })

    await expect(idempotency.run({
      userId: 'synthetic-staging-user',
      operation: 'synthetic.create',
      key: 'concurrent-key-1',
      payload: { value: 10 },
      executeInTransaction: async () => ({ resourceRef: 'unused' })
    })).rejects.toMatchObject({ status: 409, code: 'idempotency_conflict' })
  })

  it('allows one of two concurrent versioned updates with the same expectedVersion', async () => {
    const ref = db.collection(`${testNamespace()}_v2_resources`).doc('synthetic-resource')
    await ref.create({ userId: 'synthetic-staging-user', value: 0, version: 0, deletionState: 'active' })
    const update = value => mutateVersioned({
      db,
      ref,
      expectedVersion: 0,
      mutate: () => ({ value })
    })

    const outcomes = await Promise.allSettled([update(1), update(2)])
    const final = (await ref.get()).data()
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(1)
    expect(outcomes.filter(outcome => outcome.status === 'rejected' && outcome.reason.status === 409)).toHaveLength(1)
    expect(final.version).toBe(1)
    expect([1, 2]).toContain(final.value)
  })
})
