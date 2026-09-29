const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/** Normalize a stored value for analytics. Invalid or absent costs stay unknown. */
export function normalizeKnownCostV1(value) {
    if (value === null || value === undefined) return null
    if (typeof value === 'string' && value.trim() === '') return null
    if (typeof value !== 'number' && typeof value !== 'string') return null

    const cost = typeof value === 'string' ? Number(value.trim()) : value
    return Number.isFinite(cost) && cost >= 0 ? cost : null
}

/** Validate a form value while preserving an empty value as an unknown cost. */
export function normalizeMaintenanceCostInputV1(value) {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
        return null
    }
    if (typeof value !== 'number' && typeof value !== 'string') {
        throw new Error('التكلفة غير صالحة.')
    }

    const cost = typeof value === 'string' ? Number(value.trim()) : value
    if (!Number.isFinite(cost) || cost < 0) throw new Error('التكلفة غير صالحة.')
    return cost
}

/** Parse known date representations without allowing an invalid date into analytics. */
export function parseMaintenanceRecordDateV1(value) {
    try {
        let date
        if (value instanceof Date) {
            date = new Date(value.getTime())
        } else if (typeof value === 'string') {
            const trimmed = value.trim()
            const dateOnly = DATE_ONLY_PATTERN.exec(trimmed)
            if (dateOnly) {
                const [, year, month, day] = dateOnly.map(Number)
                date = new Date(year, month - 1, day)
                if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null
            } else if (trimmed) {
                date = new Date(trimmed)
            }
        } else if (typeof value === 'number' && Number.isFinite(value)) {
            date = new Date(value)
        } else if (value && typeof value.toDate === 'function') {
            date = value.toDate()
        } else if (value && Number.isFinite(value.seconds ?? value._seconds)) {
            date = new Date(Number(value.seconds ?? value._seconds) * 1000)
        }

        return date instanceof Date && Number.isFinite(date.getTime()) ? date : null
    } catch {
        return null
    }
}

function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function addFiniteCost(total, cost) {
    const next = total + cost
    return Number.isFinite(next) ? next : total
}

function endOfLocalDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

export function matchesMaintenanceRecordSearchV1(record, query) {
    const needle = String(query ?? '').trim().toLocaleLowerCase()
    if (!needle) return true

    return [record?.taskName, record?.serviceCenter, record?.notes, record?.invoiceNumber]
        .some(value => String(value ?? '').toLocaleLowerCase().includes(needle))
}

/** All values are derived from V1 maintenance records; this function performs no I/O. */
export function computeMaintenanceCostInsightsV1(records = [], now = new Date()) {
    const safeRecords = Array.isArray(records) ? records : []
    const current = parseMaintenanceRecordDateV1(now) || new Date()
    const currentDayEnd = endOfLocalDay(current)
    const thisMonthStart = new Date(current.getFullYear(), current.getMonth(), 1)
    const thisYearStart = new Date(current.getFullYear(), 0, 1)
    const last12MonthsStart = new Date(current.getFullYear(), current.getMonth() - 11, 1)
    const trendStart = new Date(current.getFullYear(), current.getMonth() - 5, 1)

    const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(current.getFullYear(), current.getMonth() - 5 + index, 1)
        return { key: monthKey(date), date, totalCost: 0, knownCostRecords: 0 }
    })
    const monthlyByKey = new Map(monthlyTrend.map(bucket => [bucket.key, bucket]))

    let totalKnownCost = 0
    let thisMonthCost = 0
    let thisYearCost = 0
    let last12MonthsCost = 0
    let highestSingleCost = null
    let knownCostRecords = 0
    let thisMonthKnownCostRecords = 0
    let thisYearKnownCostRecords = 0
    let last12MonthsKnownCostRecords = 0
    const costsByTask = new Map()

    for (const record of safeRecords) {
        const cost = normalizeKnownCostV1(record?.cost)
        if (cost === null) continue

        knownCostRecords += 1
        totalKnownCost = addFiniteCost(totalKnownCost, cost)
        highestSingleCost = highestSingleCost === null ? cost : Math.max(highestSingleCost, cost)

        const taskName = String(record?.taskName ?? '').trim()
        if (taskName) {
            const currentTaskCost = costsByTask.get(taskName) || { totalCost: 0, records: 0 }
            currentTaskCost.totalCost = addFiniteCost(currentTaskCost.totalCost, cost)
            currentTaskCost.records += 1
            costsByTask.set(taskName, currentTaskCost)
        }

        const date = parseMaintenanceRecordDateV1(record?.date)
        if (!date || date > currentDayEnd) continue

        if (date >= thisMonthStart) {
            thisMonthCost = addFiniteCost(thisMonthCost, cost)
            thisMonthKnownCostRecords += 1
        }
        if (date >= thisYearStart) {
            thisYearCost = addFiniteCost(thisYearCost, cost)
            thisYearKnownCostRecords += 1
        }
        if (date >= last12MonthsStart) {
            last12MonthsCost = addFiniteCost(last12MonthsCost, cost)
            last12MonthsKnownCostRecords += 1
        }

        if (date >= trendStart) {
            const bucket = monthlyByKey.get(monthKey(date))
            if (bucket) {
                bucket.totalCost = addFiniteCost(bucket.totalCost, cost)
                bucket.knownCostRecords += 1
            }
        }
    }

    const topMaintenanceCosts = [...costsByTask.entries()]
        .map(([taskName, value]) => ({ taskName, ...value }))
        .filter(item => item.totalCost > 0)
        .sort((left, right) => right.totalCost - left.totalCost || left.taskName.localeCompare(right.taskName, 'ar'))
        .slice(0, 5)

    return {
        totalKnownCost,
        thisMonthCost,
        thisMonthKnownCostRecords,
        thisYearCost,
        thisYearKnownCostRecords,
        last12MonthsCost,
        last12MonthsKnownCostRecords,
        averageKnownCost: knownCostRecords ? totalKnownCost / knownCostRecords : null,
        highestSingleCost,
        knownCostRecords,
        unknownCostRecords: safeRecords.length - knownCostRecords,
        monthlyTrend,
        trendHasCostData: monthlyTrend.some(bucket => bucket.knownCostRecords > 0),
        topMaintenanceCosts
    }
}
