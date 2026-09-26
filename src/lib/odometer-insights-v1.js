const DAY_MS = 24 * 60 * 60 * 1000

export const ODOMETER_CONFIDENCE_V1 = Object.freeze({
    INSUFFICIENT: 'insufficient',
    BASIC: 'basic',
    GOOD: 'good'
})

function toReading(value) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null
    if (typeof value !== 'number' && typeof value !== 'string') return null
    const reading = Number(value)
    return Number.isFinite(reading) && reading >= 0 ? reading : null
}

function toTimestamp(value) {
    try {
        if (value instanceof Date) return value.getTime()
        if (value && typeof value.toDate === 'function') return value.toDate().getTime()
        if (value && Number.isFinite(Number(value.seconds))) {
            return Number(value.seconds) * 1000 + Number(value.nanoseconds || 0) / 1e6
        }
        if (typeof value === 'number') return value
        if (typeof value === 'string' && value.trim()) return Date.parse(value)
    } catch {
        return Number.NaN
    }
    return Number.NaN
}

function sampleSpanDays(readings) {
    if (readings.length < 2) return 0
    const span = (readings.at(-1).timestamp - readings[0].timestamp) / DAY_MS
    return Number.isFinite(span) && span > 0 ? span : 0
}

function makeHistoryAndAnalysis(readings, nowMs) {
    const parsed = readings.map((row, index) => {
        const reading = toReading(row?.reading)
        const timestamp = toTimestamp(row?.date)
        let excludeReason = null
        if (reading === null) excludeReason = 'invalid_reading'
        else if (!Number.isFinite(timestamp)) excludeReason = 'invalid_date'
        else if (timestamp > nowMs) excludeReason = 'future_date'

        return {
            index,
            id: row?.id ?? String(index),
            reading: reading ?? row?.reading ?? null,
            readingValue: reading,
            timestamp,
            date: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
            valid: excludeReason === null,
            excludeReason,
            notes: row?.notes || ''
        }
    })

    const groupsByDay = new Map()
    for (const item of parsed) {
        if (!item.valid) continue
        const dayKey = new Date(item.timestamp).toISOString().slice(0, 10)
        let group = groupsByDay.get(dayKey)
        if (!group) {
            group = { dayKey, items: [], representative: item, accepted: false, excludeReason: null }
            groupsByDay.set(dayKey, group)
        }
        group.items.push(item)
        if (item.readingValue > group.representative.readingValue
            || (item.readingValue === group.representative.readingValue && item.timestamp > group.representative.timestamp)) {
            group.representative = item
        }
    }

    const groups = [...groupsByDay.values()].sort((a, b) => a.representative.timestamp - b.representative.timestamp)
    const analysisReadings = []
    let previous = null
    for (const group of groups) {
        if (previous && group.representative.readingValue < previous.readingValue) {
            group.excludeReason = 'odometer_decreased'
            continue
        }

        group.accepted = true
        group.distanceSincePrevious = previous
            ? group.representative.readingValue - previous.readingValue
            : null
        analysisReadings.push({
            id: group.representative.id,
            reading: group.representative.readingValue,
            date: group.representative.date,
            timestamp: group.representative.timestamp,
            dayKey: group.dayKey,
            distanceSincePrevious: group.distanceSincePrevious
        })
        previous = group.representative
    }

    const groupForIndex = new Map()
    for (const group of groups) {
        for (const item of group.items) groupForIndex.set(item.index, group)
    }

    const history = parsed.map(item => {
        if (!item.valid) {
            return {
                id: item.id,
                reading: item.reading,
                date: item.date,
                notes: item.notes,
                valid: false,
                includedInInsights: false,
                distanceSincePrevious: null,
                excludeReason: item.excludeReason
            }
        }

        const group = groupForIndex.get(item.index)
        const isRepresentative = group.representative.index === item.index
        const includedInInsights = group.accepted && isRepresentative
        return {
            id: item.id,
            reading: item.readingValue,
            date: item.date,
            notes: item.notes,
            valid: true,
            includedInInsights,
            distanceSincePrevious: includedInInsights ? group.distanceSincePrevious : null,
            excludeReason: group.accepted
                ? (isRepresentative ? null : 'same_day')
                : group.excludeReason
        }
    }).sort((a, b) => {
        const dateA = toTimestamp(a.date)
        const dateB = toTimestamp(b.date)
        const validDateA = Number.isFinite(dateA)
        const validDateB = Number.isFinite(dateB)
        if (validDateA !== validDateB) return validDateA ? -1 : 1
        if (validDateA && dateA !== dateB) return dateB - dateA
        return Number(b.reading) - Number(a.reading)
    })

    const excludedReadings = parsed.filter(item => !item.valid).length
        + groups.filter(group => group.excludeReason === 'odometer_decreased').reduce((count, group) => count + group.items.length, 0)
    const sameDayReadingsCollapsed = groups.reduce((count, group) => count + Math.max(0, group.items.length - 1), 0)

    return { analysisReadings, history, excludedReadings, sameDayReadingsCollapsed }
}

function isUsableSample(readings, minimumDays) {
    return readings.length >= 2 && sampleSpanDays(readings) >= minimumDays
}

/**
 * Derive V1 usage insights from real odometer readings without modifying source data.
 * Same-day entries are grouped to their highest reading for analysis; later counter
 * decreases are excluded while preserving the last accepted reading as the anchor.
 */
export function calculateOdometerInsightsV1(readings = [], { now = new Date(), recentWindowDays = 90 } = {}) {
    const nowMs = toTimestamp(now)
    const safeReadings = Array.isArray(readings) ? readings : []
    if (!Number.isFinite(nowMs)) {
        return {
            averageDailyKm: null,
            averageMonthlyKm: null,
            sampleDays: 0,
            sampleReadings: 0,
            source: 'insufficient',
            confidence: ODOMETER_CONFIDENCE_V1.INSUFFICIENT,
            excludedReadings: safeReadings.length,
            sameDayReadingsCollapsed: 0,
            history: [],
            analysisReadings: []
        }
    }

    const { analysisReadings, history, excludedReadings, sameDayReadingsCollapsed } = makeHistoryAndAnalysis(safeReadings, nowMs)
    const recentCutoff = nowMs - Math.max(0, Number(recentWindowDays) || 90) * DAY_MS
    const recentReadings = analysisReadings.filter(item => item.timestamp >= recentCutoff && item.timestamp <= nowMs)
    const recentUsable = isUsableSample(recentReadings, 7)
    const historicalUsable = isUsableSample(analysisReadings, 14)

    let selectedReadings = []
    let source = 'insufficient'
    if (recentUsable) {
        selectedReadings = recentReadings
        source = 'recent'
    } else if (historicalUsable) {
        selectedReadings = analysisReadings
        source = 'historical'
    } else {
        selectedReadings = recentReadings.length >= 2 ? recentReadings : analysisReadings
    }

    const sampleDays = sampleSpanDays(selectedReadings)
    const sampleReadings = selectedReadings.length
    const distance = sampleReadings >= 2
        ? selectedReadings.at(-1).reading - selectedReadings[0].reading
        : 0
    const averageDailyKm = source !== 'insufficient' && sampleDays > 0
        ? distance / sampleDays
        : null
    const averageMonthlyKm = averageDailyKm === null ? null : averageDailyKm * 30
    const confidence = averageDailyKm === null
        ? ODOMETER_CONFIDENCE_V1.INSUFFICIENT
        : sampleReadings >= 3 && sampleDays >= 30
            ? ODOMETER_CONFIDENCE_V1.GOOD
            : ODOMETER_CONFIDENCE_V1.BASIC

    return {
        averageDailyKm: Number.isFinite(averageDailyKm) ? averageDailyKm : null,
        averageMonthlyKm: Number.isFinite(averageMonthlyKm) ? averageMonthlyKm : null,
        sampleDays: Number.isFinite(sampleDays) ? sampleDays : 0,
        sampleReadings,
        source: confidence === ODOMETER_CONFIDENCE_V1.INSUFFICIENT ? 'insufficient' : source,
        confidence,
        excludedReadings,
        sameDayReadingsCollapsed,
        history,
        analysisReadings
    }
}
