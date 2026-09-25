import { describe, expect, it } from 'vitest'
import { calculateTaskStatusV1, hasValidTaskBaselineV1, TASK_STATUS_V1 } from '../../src/lib/task-status-v1.js'

const now = new Date('2026-09-26T12:00:00.000Z')

describe('V1 maintenance task status', () => {
    it('marks a task without history as needs setup, never overdue', () => {
        const result = calculateTaskStatusV1({
            type: 'both', intervalKm: 10000, intervalMonths: 6,
            lastMaintenanceDate: null, lastMaintenanceOdometer: null
        }, { currentOdometer: 200000, now })

        expect(result.status).toBe(TASK_STATUS_V1.NEEDS_SETUP)
        expect(result.progress).toBe(0)
        expect(result.estimatedDate).toBeNull()
        expect(result.kmRemaining).toBeNull()
    })

    it('calculates the next due date from a valid legacy baseline with no baseline_type field', () => {
        const task = {
            type: 'both', intervalKm: 10000, intervalMonths: 6,
            lastMaintenanceDate: '2026-08-15T00:00:00.000Z', lastMaintenanceOdometer: 50000
        }
        const result = calculateTaskStatusV1(task, { currentOdometer: 56000, averageDailyKm: 100, now })

        expect(hasValidTaskBaselineV1(task)).toBe(true)
        expect(result.status).toBe(TASK_STATUS_V1.GOOD)
        expect(result.kmRemaining).toBe(4000)
        expect(result.estimatedDate).not.toBeNull()
    })

    it('treats an incomplete combined baseline as needs setup', () => {
        const result = calculateTaskStatusV1({
            type: 'both', intervalKm: 10000, intervalMonths: 6,
            lastMaintenanceDate: null, lastMaintenanceOdometer: 50000
        }, { currentOdometer: 90000, now })

        expect(result.status).toBe(TASK_STATUS_V1.NEEDS_SETUP)
        expect(result.progress).toBe(0)
    })

    it('recognizes a start-today baseline without creating a maintenance record', () => {
        const task = {
            type: 'both', intervalKm: 10000, intervalMonths: 6,
            baselineType: 'tracking_start',
            lastMaintenanceDate: now.toISOString(), lastMaintenanceOdometer: 56000
        }
        const result = calculateTaskStatusV1(task, { currentOdometer: 56000, now })

        expect(result.status).toBe(TASK_STATUS_V1.GOOD)
        expect(result.needsSetup).toBe(false)
        expect(task).not.toHaveProperty('record')
    })

    it('keeps an explicit unknown baseline in needs setup even if stale baseline fields exist', () => {
        const result = calculateTaskStatusV1({
            type: 'distance', intervalKm: 10000,
            baselineType: 'unknown', lastMaintenanceOdometer: 50000
        }, { currentOdometer: 90000, now })

        expect(result.status).toBe(TASK_STATUS_V1.NEEDS_SETUP)
    })

    it('does not lower the derived progress when current odometer is below a historical baseline', () => {
        const result = calculateTaskStatusV1({
            type: 'distance', intervalKm: 10000, lastMaintenanceOdometer: 50000
        }, { currentOdometer: 49000, now })

        expect(result.status).toBe(TASK_STATUS_V1.GOOD)
        expect(result.progress).toBe(0)
        expect(result.kmRemaining).toBe(10000)
    })

    it('only marks a task overdue after a valid baseline exceeds its due cycle', () => {
        const result = calculateTaskStatusV1({
            type: 'distance', intervalKm: 10000, lastMaintenanceOdometer: 50000
        }, { currentOdometer: 61000, now })

        expect(result.status).toBe(TASK_STATUS_V1.LATE)
    })
})
