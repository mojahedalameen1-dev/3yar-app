import { describe, expect, it } from 'vitest'
import { buildMaintenanceBaselineV1 } from '../../src/lib/maintenance-baseline-v1.js'

const task = { type: 'both', intervalKm: 10000, intervalMonths: 6 }
const today = new Date('2026-09-26T12:00:00.000Z')

describe('V1 maintenance baseline setup', () => {
    it('stores a known historical maintenance baseline without creating a record payload', () => {
        const baseline = buildMaintenanceBaselineV1({
            task,
            choice: 'maintenance',
            lastMaintenanceDate: '2026-08-15',
            lastMaintenanceOdometer: 50000,
            currentOdometer: 56000,
            today
        })

        expect(baseline).toEqual({
            baselineType: 'reported_maintenance',
            lastMaintenanceDate: '2026-08-15T00:00:00.000Z',
            lastMaintenanceOdometer: 50000
        })
        expect(baseline).not.toHaveProperty('record')
    })

    it('starts tracking from today and the current odometer, not a service record', () => {
        const baseline = buildMaintenanceBaselineV1({
            task,
            choice: 'tracking_start',
            currentOdometer: 56000,
            today
        })

        expect(baseline).toEqual({
            baselineType: 'tracking_start',
            lastMaintenanceDate: today.toISOString(),
            lastMaintenanceOdometer: 56000
        })
        expect(baseline).not.toHaveProperty('record')
    })

    it('keeps unknown history empty and explicit', () => {
        expect(buildMaintenanceBaselineV1({ task, choice: 'unknown', today })).toEqual({
            baselineType: 'unknown',
            lastMaintenanceDate: null,
            lastMaintenanceOdometer: null
        })
    })

    it('rejects a future date, a missing required odometer, or a historical reading above current', () => {
        expect(() => buildMaintenanceBaselineV1({ task, choice: 'maintenance', lastMaintenanceDate: '2026-09-27', lastMaintenanceOdometer: 50000, currentOdometer: 56000, today })).toThrow('المستقبل')
        expect(() => buildMaintenanceBaselineV1({ task, choice: 'maintenance', lastMaintenanceDate: '2026-08-15', currentOdometer: 56000, today })).toThrow('العداد')
        expect(() => buildMaintenanceBaselineV1({ task, choice: 'maintenance', lastMaintenanceDate: '2026-08-15', lastMaintenanceOdometer: 57000, currentOdometer: 56000, today })).toThrow('العداد الحالي')
    })
})
