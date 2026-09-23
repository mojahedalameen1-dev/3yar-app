import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const state = vi.hoisted(() => ({ deleteQueries: [], childQueries: [], batches: [] }))

function queryBuilder(collectionName) {
    const query = { collectionName, constraints: [], delete() { return this }, eq(field, value) { this.constraints.push({ field, value }); return this }, then(resolve, reject) { return Promise.resolve({ data: null, error: null }).then(resolve, reject) } }
    state.deleteQueries.push(query)
    return query
}

vi.mock('../../src/lib/firebase.js', () => ({
    firebaseAuth: { currentUser: { uid: 'owner-1' } },
    firestore: {},
    supabase: { auth: { getSession: async () => ({ data: { session: { user: { id: 'owner-1' } } } }) }, from: vi.fn(queryBuilder) }
}))
vi.mock('firebase/firestore', () => ({
    collection: (_db, name) => ({ name }),
    doc: (_db, collectionName, id) => ({ collectionName, id }),
    getDoc: async () => ({ exists: () => true, data: () => ({ user_id: 'owner-1', deletion_requested: false }) }),
    updateDoc: async () => {},
    getDocs: async query => { state.childQueries.push(query); return { docs: [] } },
    query: (collectionRef, ...constraints) => ({ collection: collectionRef.name, constraints }),
    where: (field, operator, value) => ({ field, operator, value }),
    writeBatch: () => {
        const batch = { deleted: [], delete(ref) { this.deleted.push(ref) }, async commit() { state.batches.push(this.deleted) } }
        return batch
    }
}))

import { useCarStore } from '../../src/stores/car.js'
import { useTasksStore } from '../../src/stores/tasks.js'
import { useRecordsStore } from '../../src/stores/records.js'
import { useDocumentsStore } from '../../src/stores/documents.js'
import { useOdometerStore } from '../../src/stores/odometer.js'
import { deleteCarDataV1 } from '../../src/lib/car-deletion-v1.js'

describe('owner and car scoped V1 deletion', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        useCarStore().car = { id: 'car-1' }
        state.deleteQueries = []
        state.childQueries = []
        state.batches = []
    })

    it('scopes single-record deletion by id, authenticated owner and active car', async () => {
        await useTasksStore().deleteTask('task-1')
        await useRecordsStore().deleteRecord('record-1')
        await useDocumentsStore().deleteDocument('document-1')
        await useOdometerStore().deleteReading('reading-1')
        expect(state.deleteQueries).toHaveLength(4)
        for (const query of state.deleteQueries) {
            expect(query.constraints).toEqual(expect.arrayContaining([
                { field: 'id', value: expect.any(String) },
                { field: 'user_id', value: 'owner-1' },
                { field: 'car_id', value: 'car-1' }
            ]))
        }
    })

    it('queries every child only for owner and target car before one atomic batch', async () => {
        await deleteCarDataV1('car-1')
        expect(state.childQueries).toHaveLength(4)
        for (const query of state.childQueries) {
            expect(query.constraints).toEqual(expect.arrayContaining([
                { field: 'user_id', operator: '==', value: 'owner-1' },
                { field: 'car_id', operator: '==', value: 'car-1' }
            ]))
        }
        expect(state.batches).toHaveLength(1)
        expect(state.batches[0]).toEqual([expect.objectContaining({ collectionName: 'cars', id: 'car-1' })])
    })
})
