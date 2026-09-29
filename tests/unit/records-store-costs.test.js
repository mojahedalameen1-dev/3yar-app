import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const state = vi.hoisted(() => ({ operations: [], result: null }))

function builder(collectionName) {
    const query = {
        collectionName,
        operation: 'select',
        payload: null,
        select() { return this },
        insert(value) { this.operation = 'insert'; this.payload = value; return this },
        update(value) { this.operation = 'update'; this.payload = value; return this },
        delete() { this.operation = 'delete'; return this },
        eq() { return this },
        order() { return this },
        maybeSingle() { return this },
        then(resolve, reject) {
            state.operations.push({ collectionName, operation: this.operation, payload: this.payload })
            return Promise.resolve({ data: state.result, error: null }).then(resolve, reject)
        }
    }
    return query
}

vi.mock('../../src/lib/firebase.js', () => ({
    supabase: {
        auth: { getSession: async () => ({ data: { session: { user: { id: 'owner-1' } } } }) },
        from: vi.fn(builder)
    }
}))
vi.mock('../../src/stores/car.js', () => ({ useCarStore: () => ({ car: { id: 'car-1' } }) }))

import { useRecordsStore } from '../../src/stores/records.js'

describe('V1 records cost persistence', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        state.operations = []
        state.result = { id: 'record-1', cost: null, user_id: 'owner-1', car_id: 'car-1' }
    })

    it('persists empty cost as null instead of coercing it to zero', async () => {
        const store = useRecordsStore()
        await store.addRecord({ taskId: 'task-1', taskName: 'صيانة', cost: '' })

        expect(state.operations[0].payload[0].cost).toBeNull()
        expect(store.records[0].cost).toBeNull()
    })

    it('persists an explicit zero as a known zero cost', async () => {
        state.result = { id: 'record-2', cost: 0, user_id: 'owner-1', car_id: 'car-1' }
        const store = useRecordsStore()
        await store.addRecord({ taskId: 'task-1', taskName: 'صيانة مجانية', cost: 0 })

        expect(state.operations[0].payload[0].cost).toBe(0)
        expect(store.costInsights.knownCostRecords).toBe(1)
        expect(store.costInsights.averageKnownCost).toBe(0)
    })
})
