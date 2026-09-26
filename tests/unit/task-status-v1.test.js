import { describe, expect, it } from 'vitest'
import { calculateTaskStatusV1, hasValidTaskBaselineV1, TASK_STATUS_V1 } from '../../src/lib/task-status-v1.js'
import { ODOMETER_CONFIDENCE_V1 } from '../../src/lib/odometer-insights-v1.js'

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

    it('forecasts a distance task only when the usage rate has basic or good confidence', () => {
        const task = { type: 'distance', intervalKm: 10000, lastMaintenanceOdometer: 50000 }
        const reliable = calculateTaskStatusV1(task, {
            currentOdometer: 56000,
            averageDailyKm: 100,
            usageConfidence: ODOMETER_CONFIDENCE_V1.BASIC,
            now
        })
        const insufficient = calculateTaskStatusV1(task, {
            currentOdometer: 56000,
            averageDailyKm: 100,
            usageConfidence: ODOMETER_CONFIDENCE_V1.INSUFFICIENT,
            now
        })

        expect(reliable.kmRemaining).toBe(4000)
        expect(reliable.estimatedDate).toBe('2026-11-05T12:00:00.000Z')
        expect(reliable.estimatedDateSource).toBe('distance')
        expect(insufficient.estimatedDate).toBeNull()
    })

    it('keeps the time-based due date independent from odometer usage confidence', () => {
        const task = {
            type: 'time', intervalMonths: 3,
            lastMaintenanceDate: '2026-07-01T00:00:00.000Z'
        }
        const result = calculateTaskStatusV1(task, { averageDailyKm: null, now })

        expect(result.estimatedDate).toBe('2026-10-01T00:00:00.000Z')
        expect(result.estimatedDateSource).toBe('time')
    })

    it('chooses the earlier valid mileage or time due mechanism for a combined task', () => {
        const task = {
            type: 'both', intervalKm: 10000, intervalMonths: 6,
            lastMaintenanceDate: '2026-08-15T00:00:00.000Z', lastMaintenanceOdometer: 50000
        }
        const distanceWins = calculateTaskStatusV1(task, {
            currentOdometer: 56000,
            averageDailyKm: 100,
            usageConfidence: ODOMETER_CONFIDENCE_V1.GOOD,
            now
        })
        const timeWins = calculateTaskStatusV1({ ...task, intervalMonths: 1, lastMaintenanceDate: '2026-09-20T00:00:00.000Z' }, {
            currentOdometer: 51000,
            averageDailyKm: 1,
            usageConfidence: ODOMETER_CONFIDENCE_V1.BASIC,
            now
        })

        expect(distanceWins.estimatedDateSource).toBe('distance')
        expect(distanceWins.estimatedDate).toBe('2026-11-05T12:00:00.000Z')
        expect(timeWins.estimatedDateSource).toBe('time')
        expect(timeWins.estimatedDate).toBe('2026-10-20T00:00:00.000Z')
    })

    it('does not let an early forecast mark a task overdue before actual progress reaches a threshold', () => {
        const result = calculateTaskStatusV1({
            type: 'distance', intervalKm: 10000, lastMaintenanceOdometer: 50000
        }, {
            currentOdometer: 51000,
            averageDailyKm: 1000,
            usageConfidence: ODOMETER_CONFIDENCE_V1.GOOD,
            now
        })

        expect(result.estimatedDate).not.toBeNull()
        expect(result.status).toBe(TASK_STATUS_V1.GOOD)
        expect(result.progress).toBe(10)
    })

    it('rejects non-finite usage rates instead of emitting invalid forecast values', () => {
        const result = calculateTaskStatusV1({
            type: 'distance', intervalKm: 10000, lastMaintenanceOdometer: 50000
        }, {
            currentOdometer: 56000,
            averageDailyKm: Number.POSITIVE_INFINITY,
            usageConfidence: ODOMETER_CONFIDENCE_V1.GOOD,
            now
        })

        expect(result.estimatedDate).toBeNull()
        expect(Number.isFinite(result.progress)).toBe(true)
    })

    it('does not derive distance remaining or a forecast from a missing current odometer', () => {
        const result = calculateTaskStatusV1({
            type: 'distance', intervalKm: 10000, lastMaintenanceOdometer: 50000
        }, {
            currentOdometer: null,
            averageDailyKm: 100,
            usageConfidence: ODOMETER_CONFIDENCE_V1.GOOD,
            now
        })

        expect(result.kmRemaining).toBeNull()
        expect(result.estimatedDate).toBeNull()
    })
})
