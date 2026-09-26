import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
    car: { user_id: 'owner-1', current_odometer: 80000 },
    readings: new Map(),
    writes: [],
    nextId: 0,
    transactionQueue: Promise.resolve()
}))

vi.mock('../../src/lib/firebase.js', () => ({
    firebaseAuth: { currentUser: { uid: 'owner-1' } },
    firestore: {}
}))

vi.mock('firebase/firestore', () => ({
    collection: (_db, name) => ({ collectionName: name }),
    doc: (...args) => {
        if (args.length === 3) return { collectionName: args[1], id: args[2] }
        const reference = args[0]
        return { collectionName: reference.collectionName, id: `generated-${++state.nextId}` }
    },
    runTransaction: async (_db, callback) => {
        const previous = state.transactionQueue
        let release
        state.transactionQueue = new Promise(resolve => { release = resolve })
        await previous
        try {
            return await callback({
                async get(reference) {
                    if (reference.collectionName === 'cars') {
                        return { exists: () => Boolean(state.car), data: () => state.car }
                    }
                    const data = state.readings.get(reference.id)
                    return { exists: () => Boolean(data), data: () => data }
                },
                set(reference, value) {
                    state.readings.set(reference.id, value)
                    state.writes.push({ operation: 'set', id: reference.id, value })
                },
                update(reference, changes) {
                    state.car = { ...state.car, ...changes }
                    state.writes.push({ operation: 'update', changes })
                }
            })
        } finally {
            release()
        }
    }
}))

import { commitOdometerReadingV1 } from '../../src/lib/odometer-entry-v1.js'

describe('V1 odometer reading commit', () => {
    beforeEach(() => {
        state.car = { user_id: 'owner-1', current_odometer: 80000 }
        state.readings = new Map()
        state.writes = []
        state.nextId = 0
        state.transactionQueue = Promise.resolve()
    })

    it('atomically records a higher reading and raises the current odometer', async () => {
        const result = await commitOdometerReadingV1({
            carId: 'car-1',
            readingData: { reading: 80500, date: '2026-09-26T12:00:00.000Z', notes: 'manual' }
        })

        expect(result.reading).toMatchObject({ user_id: 'owner-1', car_id: 'car-1', reading: 80500 })
        expect(result.car.current_odometer).toBe(80500)
        expect(state.writes.map(write => write.operation)).toEqual(['set', 'update'])
    })

    it('rejects lower or equal manual readings without writing or lowering the car', async () => {
        await expect(commitOdometerReadingV1({ carId: 'car-1', readingData: { reading: 79999 } }))
            .rejects.toThrow('أعلى من العداد الحالي')
        await expect(commitOdometerReadingV1({ carId: 'car-1', readingData: { reading: 80000 } }))
            .rejects.toThrow('أعلى من العداد الحالي')
        expect(state.writes).toEqual([])
        expect(state.car.current_odometer).toBe(80000)
    })

    it('allows only an explicit onboarding baseline at the current value and reuses its stable document', async () => {
        const args = {
            carId: 'car-1',
            allowCurrentBaseline: true,
            readingData: { reading: 80000, date: '2026-09-26T12:00:00.000Z' }
        }
        const first = await commitOdometerReadingV1(args)
        const retry = await commitOdometerReadingV1(args)

        expect(first.reading.id).toBe('initial_car-1')
        expect(retry.reading.id).toBe(first.reading.id)
        expect([...state.readings.values()]).toHaveLength(1)
        expect(state.writes.map(write => write.operation)).toEqual(['set', 'set'])
        expect(state.writes.map(write => write.id)).toEqual(['initial_car-1', 'initial_car-1'])
    })

    it('prevents concurrent duplicate submissions from creating duplicate readings', async () => {
        const args = { carId: 'car-1', readingData: { reading: 80500 } }
        const results = await Promise.allSettled([
            commitOdometerReadingV1(args),
            commitOdometerReadingV1(args)
        ])

        expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
        expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
        expect([...state.readings.values()]).toHaveLength(1)
        expect(state.writes.filter(write => write.operation === 'set')).toHaveLength(1)
        expect(state.car.current_odometer).toBe(80500)
    })

    it('rejects cars owned by another user or marked for deletion', async () => {
        state.car = { user_id: 'other-user', current_odometer: 80000 }
        await expect(commitOdometerReadingV1({ carId: 'car-1', readingData: { reading: 80500 } }))
            .rejects.toThrow('لا تملك صلاحية')

        state.car = { user_id: 'owner-1', current_odometer: 80000, deletion_requested: true }
        await expect(commitOdometerReadingV1({ carId: 'car-1', readingData: { reading: 80500 } }))
            .rejects.toThrow('لا تملك صلاحية')
        expect(state.writes).toEqual([])
    })

    it('rejects invalid readings and dates before creating a Firestore write', async () => {
        await expect(commitOdometerReadingV1({ carId: 'car-1', readingData: { reading: Number.NaN } }))
            .rejects.toThrow('قراءة عداد صحيحة')
        await expect(commitOdometerReadingV1({ carId: 'car-1', readingData: { reading: true } }))
            .rejects.toThrow('قراءة عداد صحيحة')
        await expect(commitOdometerReadingV1({ carId: 'car-1', readingData: { reading: 80500, date: 'bad-date' } }))
            .rejects.toThrow('تاريخ القراءة غير صالح')
        expect(state.writes).toEqual([])
    })
})
