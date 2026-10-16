import { describe, expect, it } from 'vitest'
import { buildOwnerVehiclePassportV1 } from '../../src/lib/vehicle-passport-v1'

const now = new Date('2026-09-30T12:00:00Z')
const car = { id: 'car-a', user_id: 'owner-a', make: 'QA', model: 'Example', year: 2020, color: 'white', current_odometer: 1000, vin: 'PRIVATE-VIN', plate_number: 'PRIVATE-PLATE' }
const ownerRow = { user_id: 'owner-a', car_id: 'car-a' }
const build = (overrides = {}) => buildOwnerVehiclePassportV1({ userId: 'owner-a', car, now, ...overrides })

describe('V1 private owner Vehicle Passport', () => {
    it('returns private VIN and plate only for the exact owner', () => {
        expect(build().car).toMatchObject({ vin: 'PRIVATE-VIN', plateNumber: 'PRIVATE-PLATE', currentOdometer: 1000 })
        expect(build({ userId: 'other-owner' })).toBeNull()
        expect(build({ userId: null })).toBeNull()
        expect(build({ car: { ...car, user_id: undefined } })).toBeNull()
    })

    it('rejects deleted cars rather than displaying their passport', () => {
        expect(build({ car: { ...car, deletion_requested: true } })).toBeNull()
        expect(build({ car: null })).toBeNull()
    })

    it('preserves safe empty history/documents and unknown totals', () => {
        const passport = build()
        expect(passport.history).toEqual({ recent: [], count: 0 })
        expect(passport.documents).toEqual({ valid: 0, expiringSoon: 0, expired: 0, needsExpiry: 0, total: 0 })
        expect(passport.costs).toEqual({ year: 2026, thisYear: null, totalKnown: null, unknownCount: 0 })
    })

    it('scopes every child by both owner and car, never by car alone', () => {
        const records = [
            { ...ownerRow, id: 'allowed', cost: 5, task_name: 'owned', date: '2026-09-28' },
            { ...ownerRow, user_id: 'owner-b', id: 'other-user', cost: 999, date: '2026-09-29' },
            { ...ownerRow, car_id: 'car-b', id: 'other-car', cost: 999, date: '2026-09-29' }
        ]
        const documents = [
            { ...ownerRow, id: 'allowed', type: 'registration', expiry_date: null },
            { ...ownerRow, user_id: 'owner-b', expiry_date: null },
            { ...ownerRow, car_id: 'car-b', expiry_date: null }
        ]
        const tasks = [
            { ...ownerRow, id: 'owned-task', name: 'owned task', type: 'distance', interval_km: 5000 },
            { ...ownerRow, user_id: 'owner-b', id: 'other-task', type: 'distance' }
        ]
        const passport = build({ records, documents, tasks })
        expect(passport.history.recent.map(row => row.id)).toEqual(['allowed'])
        expect(passport.documents.total).toBe(1)
        expect(passport.maintenance.tasksCount).toBe(1)
        expect(passport.costs.totalKnown).toBe(5)
    })

    it('keeps null cost unknown, preserves real zero, and aggregates only known costs', () => {
        const records = [
            { ...ownerRow, id: 'null', cost: null, date: '2026-09-29' },
            { ...ownerRow, id: 'zero', cost: 0, date: '2026-09-28' },
            { ...ownerRow, id: 'paid', cost: 125, date: '2026-09-27' },
            { ...ownerRow, id: 'historical', cost: 25, date: '2025-09-27' }
        ]
        const passport = build({ records })
        expect(passport.history.recent[0].cost).toBeNull()
        expect(passport.history.recent[1].cost).toBe(0)
        expect(passport.costs).toMatchObject({ thisYear: 125, totalKnown: 150, unknownCount: 1 })
        expect(build({ records: records.slice(0, 1) }).costs.totalKnown).toBeNull()
        expect(build({ records: records.slice(1, 2) }).costs).toMatchObject({ thisYear: 0, totalKnown: 0 })
    })

    it('sorts history newest first and displays only the latest five', () => {
        const records = Array.from({ length: 7 }, (_, index) => ({ ...ownerRow, id: `${index}`, date: `2026-09-${String(index + 1).padStart(2, '0')}` }))
        const history = build({ records }).history
        expect(history.count).toBe(7)
        expect(history.recent.map(record => record.id)).toEqual(['6', '5', '4', '3', '2'])
    })

    it('summarizes both standard and custom documents using current expiry/reminder logic', () => {
        const documents = [
            { ...ownerRow, type: 'custom', expiry_date: null },
            { ...ownerRow, type: 'fahas', expiry_date: '2026-09-29' },
            { ...ownerRow, type: 'registration', expiry_date: '2026-10-10', reminder_days: 15 },
            { ...ownerRow, type: 'insurance', expiry_date: '2027-09-30' }
        ]
        expect(build({ documents }).documents).toEqual({ valid: 1, expiringSoon: 1, expired: 1, needsExpiry: 1, total: 4 })
    })

    it('uses the existing task setup/status logic instead of inventing maintenance truth', () => {
        const tasks = [
            { ...ownerRow, id: 'setup', name: 'unknown baseline', type: 'distance', interval_km: 5000, baseline_type: 'unknown' },
            { ...ownerRow, id: 'late', name: 'overdue', type: 'distance', interval_km: 500, last_maintenance_odometer: 0 },
            { ...ownerRow, id: 'next', name: 'next', type: 'time', interval_months: 3, last_maintenance_date: '2026-09-01' }
        ]
        const passport = build({ tasks })
        expect(passport.maintenance.actionTask.id).toBe('late')
        expect(passport.maintenance.nextMaintenance.id).toBe('next')
        expect(passport.maintenance.nextMaintenance.statusInfo.estimatedDateSource).toBe('time')
    })
})
