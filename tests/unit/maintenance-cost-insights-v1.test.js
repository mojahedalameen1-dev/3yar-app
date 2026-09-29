import { describe, expect, it } from 'vitest'
import {
    computeMaintenanceCostInsightsV1,
    matchesMaintenanceRecordSearchV1,
    normalizeKnownCostV1,
    normalizeMaintenanceCostInputV1
} from '../../src/lib/maintenance-cost-insights-v1.js'

describe('V1 maintenance cost normalization', () => {
    it.each([null, undefined, '', '   '])('treats %s as unknown', value => {
        expect(normalizeKnownCostV1(value)).toBeNull()
        expect(normalizeMaintenanceCostInputV1(value)).toBeNull()
    })

    it('keeps an explicit zero as a known cost', () => {
        expect(normalizeKnownCostV1(0)).toBe(0)
        expect(normalizeMaintenanceCostInputV1('0')).toBe(0)
    })

    it('normalizes numeric strings', () => {
        expect(normalizeKnownCostV1(' 125.5 ')).toBe(125.5)
        expect(normalizeMaintenanceCostInputV1('125.5')).toBe(125.5)
    })

    it.each([-1, '-2', 'invalid', NaN, Infinity, -Infinity, true])('excludes invalid analytics value %s safely', value => {
        expect(normalizeKnownCostV1(value)).toBeNull()
        expect(() => normalizeMaintenanceCostInputV1(value)).toThrow('التكلفة غير صالحة')
    })
})

describe('V1 maintenance cost insights', () => {
    it('does not include unknown costs in totals or average, but counts them', () => {
        const insights = computeMaintenanceCostInsightsV1([
            { cost: 100, date: '2025-06-10', taskName: 'زيت' },
            { cost: null, date: '2025-06-11', taskName: 'فرامل' },
            { cost: undefined, date: '2025-06-12', taskName: 'إطارات' }
        ], new Date(2025, 5, 15, 12))

        expect(insights.totalKnownCost).toBe(100)
        expect(insights.averageKnownCost).toBe(100)
        expect(insights.knownCostRecords).toBe(1)
        expect(insights.unknownCostRecords).toBe(2)
    })

    it('includes known zero-cost records in known counts and average', () => {
        const insights = computeMaintenanceCostInsightsV1([
            { cost: 0, date: '2025-06-10', taskName: 'ضمان' },
            { cost: 100, date: '2025-06-11', taskName: 'زيت' }
        ], new Date(2025, 5, 15, 12))

        expect(insights.totalKnownCost).toBe(100)
        expect(insights.averageKnownCost).toBe(50)
        expect(insights.highestSingleCost).toBe(100)
        expect(insights.thisMonthKnownCostRecords).toBe(2)
    })

    it('includes records on the first day of a month', () => {
        const insights = computeMaintenanceCostInsightsV1([
            { cost: 50, date: '2025-06-01', taskName: 'زيت' }
        ], new Date(2025, 5, 15, 12))

        expect(insights.thisMonthCost).toBe(50)
        expect(insights.thisMonthKnownCostRecords).toBe(1)
    })

    it('includes records on the first day of a year', () => {
        const insights = computeMaintenanceCostInsightsV1([
            { cost: 70, date: '2025-01-01', taskName: 'بطارية' }
        ], new Date(2025, 0, 15, 12))

        expect(insights.thisYearCost).toBe(70)
        expect(insights.thisYearKnownCostRecords).toBe(1)
    })

    it('uses a rolling twelve calendar-month window with an inclusive first day', () => {
        const insights = computeMaintenanceCostInsightsV1([
            { cost: 40, date: '2024-07-01', taskName: 'ضمن الفترة' },
            { cost: 60, date: '2024-06-30', taskName: 'خارج الفترة' }
        ], new Date(2025, 5, 15, 12))

        expect(insights.last12MonthsCost).toBe(40)
        expect(insights.last12MonthsKnownCostRecords).toBe(1)
    })

    it('ignores invalid dates only for time-based calculations without throwing', () => {
        const insights = computeMaintenanceCostInsightsV1([
            { cost: '90', date: 'not-a-date', taskName: 'زيت' }
        ], new Date(2025, 5, 15, 12))

        expect(insights.totalKnownCost).toBe(90)
        expect(insights.highestSingleCost).toBe(90)
        expect(insights.thisMonthCost).toBe(0)
        expect(insights.thisYearCost).toBe(0)
        expect(insights.trendHasCostData).toBe(false)
    })

    it('builds six calendar-month buckets and keeps empty months at zero', () => {
        const insights = computeMaintenanceCostInsightsV1([
            { cost: 25, date: '2025-02-01', taskName: 'زيت' },
            { cost: 30, date: '2024-12-01', taskName: 'قديم' }
        ], new Date(2025, 5, 15, 12))

        expect(insights.monthlyTrend.map(bucket => bucket.key)).toEqual([
            '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06'
        ])
        expect(insights.monthlyTrend.map(bucket => bucket.totalCost)).toEqual([0, 25, 0, 0, 0, 0])
        expect(insights.trendHasCostData).toBe(true)
    })

    it('marks a records-only history with unknown costs as no chart cost data', () => {
        const insights = computeMaintenanceCostInsightsV1([
            { cost: null, date: '2025-06-10', taskName: 'زيت' },
            { cost: undefined, date: '2025-06-11', taskName: 'فرامل' }
        ], new Date(2025, 5, 15, 12))

        expect(insights.monthlyTrend.map(bucket => bucket.totalCost)).toEqual([0, 0, 0, 0, 0, 0])
        expect(insights.trendHasCostData).toBe(false)
        expect(insights.unknownCostRecords).toBe(2)
    })

    it('groups known costs by task and returns the top five in descending order', () => {
        const insights = computeMaintenanceCostInsightsV1([
            { taskName: 'زيت', cost: 400 },
            { taskName: 'الإطارات', cost: 900 },
            { taskName: 'زيت', cost: 100 },
            { taskName: 'فرامل', cost: 600 },
            { taskName: 'مجاني', cost: 0 },
            { taskName: 'مجهول', cost: null }
        ], new Date(2025, 5, 15))

        expect(insights.topMaintenanceCosts).toEqual([
            { taskName: 'الإطارات', totalCost: 900, records: 1 },
            { taskName: 'فرامل', totalCost: 600, records: 1 },
            { taskName: 'زيت', totalCost: 500, records: 2 }
        ])
    })

    it('matches service center, notes, and invoice number searches', () => {
        const record = {
            taskName: 'تغيير الزيت',
            serviceCenter: 'مركز النور',
            notes: 'تمت الصيانة بضمان',
            invoiceNumber: 'INV-2048'
        }

        expect(matchesMaintenanceRecordSearchV1(record, 'النور')).toBe(true)
        expect(matchesMaintenanceRecordSearchV1(record, 'بضمان')).toBe(true)
        expect(matchesMaintenanceRecordSearchV1(record, 'inv-2048')).toBe(true)
        expect(matchesMaintenanceRecordSearchV1(record, 'غير موجود')).toBe(false)
    })
})
