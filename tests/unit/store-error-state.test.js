import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const queryState = vi.hoisted(() => ({ result: { data: null, error: null } }))

vi.mock('../../src/lib/firebase.js', () => ({
    supabase: {
        auth: { getSession: vi.fn(async () => ({ data: { session: { user: { id: 'owner-1' } } } })) },
        from: vi.fn(() => ({
            select() { return this }, eq() { return this }, order() { return this },
            then(resolve, reject) { return Promise.resolve(queryState.result).then(resolve, reject) }
        }))
    }
}))
vi.mock('../../src/stores/car.js', () => ({ useCarStore: () => ({ car: { id: 'car-1' } }) }))

import { useTasksStore } from '../../src/stores/tasks.js'
import { useRecordsStore } from '../../src/stores/records.js'
import { useDocumentsStore } from '../../src/stores/documents.js'

describe('stores distinguish stale data from a confirmed empty result', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        queryState.result = { data: null, error: new Error('offline') }
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })
    afterEach(() => vi.restoreAllMocks())

    it('preserves prior tasks, records and documents after refresh errors', async () => {
        const tasks = useTasksStore()
        const records = useRecordsStore()
        const documents = useDocumentsStore()
        tasks.tasks.push({ id: 'task-1', name: 'قديم' })
        records.records.push({ id: 'record-1', taskName: 'قديم' })
        documents.documents.push({ id: 'document-1', type: 'license' })

        await Promise.all([tasks.fetchTasks(), records.fetchRecords(), documents.fetchDocuments()])

        expect(tasks.tasks).toHaveLength(1)
        expect(records.records).toHaveLength(1)
        expect(documents.documents).toHaveLength(1)
        expect([tasks.error, records.error, documents.error]).toEqual(['offline', 'offline', 'offline'])
        expect([tasks.loading, records.loading, documents.loading]).toEqual([false, false, false])
    })
})
