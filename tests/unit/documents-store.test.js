import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const state = vi.hoisted(() => ({ operations: [], documentResult: null }))

function builder(collectionName) {
    const query = {
        collectionName, operation: 'select', payload: null, filters: [],
        select() { return this },
        insert(value) { this.operation = 'insert'; this.payload = value; return this },
        update(value) { this.operation = 'update'; this.payload = value; return this },
        delete() { this.operation = 'delete'; return this },
        eq(field, value) { this.filters.push({ field, value }); return this },
        order() { return this },
        maybeSingle() { return this },
        then(resolve, reject) {
            state.operations.push({ collectionName, operation: this.operation, payload: this.payload, filters: this.filters })
            return Promise.resolve({ data: state.documentResult, error: null }).then(resolve, reject)
        }
    }
    return query
}

vi.mock('../../src/lib/firebase.js', () => ({
    supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'owner-1' } } } }) }, from: vi.fn(builder) }
}))
vi.mock('../../src/stores/car.js', () => ({ useCarStore: () => ({ car: { id: 'car-1' } }) }))

import { useDocumentsStore } from '../../src/stores/documents.js'

describe('V1 document writes', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        state.operations = []
        state.documentResult = { id: 'existing-doc', user_id: 'owner-1', car_id: 'car-1', type: 'license', title: 'رخصة' }
    })

    it('updates a standard document without a destructive delete-first replacement', async () => {
        const store = useDocumentsStore()
        store.documents.push({ id: 'existing-doc', type: 'license' })
        await store.addDocument({ type: 'license', title: 'محدث' })
        expect(state.operations.map(operation => operation.operation)).toEqual(['update'])
        expect(state.operations[0].filters).toEqual(expect.arrayContaining([
            { field: 'user_id', value: 'owner-1' }, { field: 'car_id', value: 'car-1' }
        ]))
    })

    it('allows multiple custom documents', async () => {
        const store = useDocumentsStore()
        state.documentResult = { id: 'custom-1', user_id: 'owner-1', car_id: 'car-1', type: 'custom' }
        await store.addDocument({ type: 'custom', title: 'وثيقة 1' })
        state.documentResult = { id: 'custom-2', user_id: 'owner-1', car_id: 'car-1', type: 'custom' }
        await store.addDocument({ type: 'custom', title: 'وثيقة 2' })
        expect(state.operations.map(operation => operation.operation)).toEqual(['insert', 'insert'])
        expect(store.documents.map(document => document.id)).toEqual(['custom-1', 'custom-2'])
    })
})
