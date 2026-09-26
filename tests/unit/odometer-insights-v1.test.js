import { describe, expect, it } from 'vitest'
import { calculateOdometerInsightsV1, ODOMETER_CONFIDENCE_V1 } from '../../src/lib/odometer-insights-v1.js'

const now = new Date('2026-09-26T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1000

function reading(value, daysAgo, id = String(value), extra = {}) {
    return {
        id,
        reading: value,
        date: new Date(now.getTime() - daysAgo * DAY_MS).toISOString(),
        ...extra
    }
}

describe('V1 odometer usage insights', () => {
    it('returns insufficient for an empty history', () => {
        expect(calculateOdometerInsightsV1([], { now })).toMatchObject({
            source: 'insufficient', confidence: ODOMETER_CONFIDENCE_V1.INSUFFICIENT,
            averageDailyKm: null, averageMonthlyKm: null, sampleReadings: 0
        })
    })

    it('returns insufficient for a single reading', () => {
        expect(calculateOdometerInsightsV1([reading(80000, 4)], { now }).confidence)
            .toBe(ODOMETER_CONFIDENCE_V1.INSUFFICIENT)
    })

    it('does not infer a rate from two readings less than seven days apart', () => {
        const result = calculateOdometerInsightsV1([reading(80000, 6), reading(80100, 0)], { now })
        expect(result.source).toBe('insufficient')
        expect(result.averageDailyKm).toBeNull()
        expect(result.sampleDays).toBeCloseTo(6)
    })

    it('calculates an unrounded basic rate from two readings spanning seven days', () => {
        const result = calculateOdometerInsightsV1([reading(80000, 7), reading(80101, 0)], { now })
        expect(result.source).toBe('recent')
        expect(result.confidence).toBe(ODOMETER_CONFIDENCE_V1.BASIC)
        expect(result.averageDailyKm).toBeCloseTo(101 / 7)
        expect(result.averageMonthlyKm).toBeCloseTo((101 / 7) * 30)
        expect(result.sampleReadings).toBe(2)
    })

    it('uses good confidence only with at least three daily readings across thirty days', () => {
        const result = calculateOdometerInsightsV1([
            reading(80000, 30), reading(80750, 15), reading(81500, 0)
        ], { now })
        expect(result.confidence).toBe(ODOMETER_CONFIDENCE_V1.GOOD)
        expect(result.sampleDays).toBeCloseTo(30)
        expect(result.sampleReadings).toBe(3)
    })

    it('prefers a usable recent ninety-day window over older readings', () => {
        const result = calculateOdometerInsightsV1([
            reading(1000, 120), reading(5000, 80), reading(6000, 30), reading(9000, 0)
        ], { now })
        expect(result.source).toBe('recent')
        expect(result.averageDailyKm).toBeCloseTo(50)
    })

    it('falls back to the full valid history when recent samples are insufficient', () => {
        const result = calculateOdometerInsightsV1([
            reading(1000, 200), reading(2000, 150), reading(5000, 5)
        ], { now })
        expect(result.source).toBe('historical')
        expect(result.sampleReadings).toBe(3)
        expect(result.sampleDays).toBeCloseTo(195)
        expect(result.averageDailyKm).toBeCloseTo(4000 / 195)
    })

    it('ignores a later dated reading that lowers the odometer without re-anchoring on it', () => {
        const result = calculateOdometerInsightsV1([
            reading(100, 20), reading(200, 10), reading(150, 5), reading(250, 0)
        ], { now })
        expect(result.averageDailyKm).toBeCloseTo(150 / 20)
        expect(result.excludedReadings).toBe(1)
        expect(result.history.find(item => item.reading === 150).excludeReason).toBe('odometer_decreased')
    })

    it('collapses same-day readings for rate analysis while keeping every history item', () => {
        const result = calculateOdometerInsightsV1([
            reading(100, 20), reading(200, 10, 'same-day-low'), reading(300, 10, 'same-day-high'), reading(400, 0)
        ], { now })
        expect(result.sampleReadings).toBe(3)
        expect(result.sameDayReadingsCollapsed).toBe(1)
        expect(result.averageDailyKm).toBeCloseTo(15)
        expect(result.history).toHaveLength(4)
        expect(result.history.find(item => item.id === 'same-day-low').excludeReason).toBe('same_day')
    })

    it('does not divide by zero for multiple readings on the same day', () => {
        const result = calculateOdometerInsightsV1([
            reading(100, 0, 'same-day-a'), reading(200, 0, 'same-day-b')
        ], { now })
        expect(result.source).toBe('insufficient')
        expect(result.averageDailyKm).toBeNull()
        expect(result.sampleReadings).toBe(1)
        expect(Number.isFinite(result.averageMonthlyKm)).toBe(false)
    })

    it('excludes invalid dates and non-finite or negative readings from analysis only', () => {
        const result = calculateOdometerInsightsV1([
            reading(80000, 20),
            { id: 'bad-date', reading: 81000, date: 'not-a-date' },
            { id: 'bad-number', reading: Number.POSITIVE_INFINITY, date: now.toISOString() },
            { id: 'boolean-number', reading: true, date: now.toISOString() },
            { id: 'negative', reading: -1, date: now.toISOString() },
            reading(82000, 0)
        ], { now })
        expect(result.averageDailyKm).toBeCloseTo(100)
        expect(result.excludedReadings).toBe(4)
        expect(result.history).toHaveLength(6)
    })

    it('keeps invalid dated readings in history without letting them corrupt sort order', () => {
        const result = calculateOdometerInsightsV1([
            { id: 'invalid-first', reading: 90000, date: 'bad-date' },
            reading(80000, 20),
            { id: 'invalid-last', reading: 91000, date: null },
            reading(82000, 0)
        ], { now })

        expect(result.history.map(item => item.id)).toEqual(['82000', '80000', 'invalid-last', 'invalid-first'])
        expect(result.history.filter(item => !item.valid)).toHaveLength(2)
    })

    it('ignores future-dated readings and never returns NaN or Infinity', () => {
        const result = calculateOdometerInsightsV1([
            reading(80000, 20), { id: 'future', reading: 999999, date: '2027-01-01T00:00:00.000Z' }, reading(82000, 0)
        ], { now })
        expect(result.excludedReadings).toBe(1)
        for (const value of [result.averageDailyKm, result.averageMonthlyKm, result.sampleDays]) {
            if (value !== null) expect(Number.isFinite(value)).toBe(true)
        }
    })
})
