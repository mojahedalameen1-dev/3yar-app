import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
    task: { user_id: 'owner-1', car_id: 'car-1', name: 'تغيير الزيت' },
    car: { user_id: 'owner-1', current_odometer: 12000 },
    writes: [],
    missingTask: false
}))

vi.mock('../../src/lib/firebase.js', () => ({ firebaseAuth: { currentUser: { uid: 'owner-1' } }, firestore: {} }))
vi.mock('firebase/firestore', () => ({
    collection: (_db, collectionName) => ({ collectionName }),
    doc: (reference, collectionName, id) => reference?.collectionName
        ? { collectionName: reference.collectionName, id: 'generated-id' }
        : { collectionName, id },
    runTransaction: async (_db, callback) => callback({
        async get(reference) {
            if (reference.collectionName === 'maintenance_tasks') return { exists: () => !state.missingTask, data: () => state.task }
            return { exists: () => true, data: () => state.car }
        },
        set(reference, value) { state.writes.push({ operation: 'set', collection: reference.collectionName, value }) },
        update(reference, value) { state.writes.push({ operation: 'update', collection: reference.collectionName, value }) }
    })
}))

import { commitMaintenanceCompletionV1 } from '../../src/lib/maintenance-completion-v1.js'

describe('atomic V1 maintenance completion', () => {
    beforeEach(() => {
        state.task = { user_id: 'owner-1', car_id: 'car-1', name: 'تغيير الزيت' }
        state.car = { user_id: 'owner-1', current_odometer: 12000 }
        state.writes = []
        state.missingTask = false
    })

    it('commits record, odometer history, task state and higher car projection together', async () => {
        const result = await commitMaintenanceCompletionV1({ taskId: 'task-1', record: { odometerReading: 12500, cost: 200 } })
        expect(state.writes.map(write => [write.operation, write.collection])).toEqual([
            ['set', 'maintenance_records'], ['set', 'odometer_readings'], ['update', 'maintenance_tasks'], ['update', 'cars']
        ])
        expect(result.record.car_id).toBe('car-1')
        expect(result.reading.source_record_id).toBe(result.record.id)
        expect(result.task.baseline_type).toBe('maintenance_record')
        expect(result.car.current_odometer).toBe(12500)
    })

    it('does not lower the car odometer for a historical lower reading', async () => {
        await commitMaintenanceCompletionV1({ taskId: 'task-1', record: { odometerReading: 11000, cost: 0 } })
        expect(state.writes.map(write => write.collection)).toEqual(['maintenance_records', 'odometer_readings', 'maintenance_tasks'])
    })

    it('stores an empty cost as unknown and propagates an optional invoice number', async () => {
        const result = await commitMaintenanceCompletionV1({
            taskId: 'task-1',
            record: { odometerReading: 12500, cost: '', invoiceNumber: 'INV-2026-1' }
        })

        expect(result.record.cost).toBeNull()
        expect(result.record.invoice_number).toBe('INV-2026-1')
        expect(state.writes.filter(write => write.operation === 'set')).toHaveLength(2)
    })

    it('preserves an explicit zero cost as a real recorded cost', async () => {
        const result = await commitMaintenanceCompletionV1({
            taskId: 'task-1',
            record: { odometerReading: 12500, cost: 0 }
        })

        expect(result.record.cost).toBe(0)
        expect(state.writes.filter(write => write.operation === 'set')).toHaveLength(2)
    })

    it('rejects a task not owned by the current user before any write', async () => {
        state.task = { ...state.task, user_id: 'other-1' }
        await expect(commitMaintenanceCompletionV1({ taskId: 'task-1', record: { odometerReading: 12500 } })).rejects.toThrow('لا تملك صلاحية')
        expect(state.writes).toEqual([])
    })

    it('rejects a car in deletion state before any write', async () => {
        state.car = { ...state.car, deletion_requested: true }
        await expect(commitMaintenanceCompletionV1({ taskId: 'task-1', record: { odometerReading: 12500 } })).rejects.toThrow('ملكية السيارة')
        expect(state.writes).toEqual([])
    })

    it('rejects invalid numeric input before commit', async () => {
        await expect(commitMaintenanceCompletionV1({ taskId: 'task-1', record: { odometerReading: -1 } })).rejects.toThrow('غير صالح')
        expect(state.writes).toEqual([])
    })

    it.each([-1, 'not-a-number', NaN, Infinity])('rejects invalid cost %s before commit', async cost => {
        await expect(commitMaintenanceCompletionV1({
            taskId: 'task-1', record: { odometerReading: 12500, cost }
        })).rejects.toThrow('التكلفة غير صالحة')
        expect(state.writes).toEqual([])
    })
})
