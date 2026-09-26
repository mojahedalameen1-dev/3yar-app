import dayjs from 'dayjs'
import { MAINTENANCE_BASELINE_TYPE, taskNeedsDistanceBaseline, taskNeedsTimeBaseline } from './maintenance-baseline-v1'
import { ODOMETER_CONFIDENCE_V1 } from './odometer-insights-v1'

export const TASK_STATUS_V1 = Object.freeze({
    NEEDS_SETUP: 'needs_setup',
    LATE: 'late',
    DUE: 'due',
    SOON: 'soon',
    GOOD: 'good'
})

function hasOdometer(value) {
    return value !== null && value !== undefined && value !== ''
        && Number.isFinite(Number(value)) && Number(value) >= 0
}

function hasDate(value) {
    return Boolean(value) && dayjs(value).isValid()
}

export function hasValidTaskBaselineV1(task) {
    if (task.baselineType === MAINTENANCE_BASELINE_TYPE.UNKNOWN) return false
    if (task.baselineType && ![
        MAINTENANCE_BASELINE_TYPE.MAINTENANCE_RECORD,
        MAINTENANCE_BASELINE_TYPE.REPORTED_MAINTENANCE,
        MAINTENANCE_BASELINE_TYPE.TRACKING_START
    ].includes(task.baselineType)) return false

    const needsDistance = taskNeedsDistanceBaseline(task)
    const needsTime = taskNeedsTimeBaseline(task)
    if (!needsDistance && !needsTime) return false

    return (!needsDistance || hasOdometer(task.lastMaintenanceOdometer))
        && (!needsTime || hasDate(task.lastMaintenanceDate))
}

export function calculateTaskStatusV1(task, {
    currentOdometer = null,
    averageDailyKm = null,
    usageConfidence = ODOMETER_CONFIDENCE_V1.INSUFFICIENT,
    now = new Date()
} = {}) {
    if (!hasValidTaskBaselineV1(task)) {
        return {
            status: TASK_STATUS_V1.NEEDS_SETUP,
            progress: 0,
            isSnoozed: false,
            needsSetup: true,
            hasNoMaintenanceHistory: true,
            estimatedDate: null,
            estimatedDateSource: null,
            kmRemaining: null,
            distanceProgress: null,
            timeProgress: null
        }
    }

    const parsedNow = dayjs(now)
    const today = parsedNow.isValid() ? parsedNow : dayjs()
    let distanceProgress = 0
    let timeProgress = 0
    let estimatedDate = null
    let estimatedDateSource = null
    let kmRemaining = null

    if (taskNeedsDistanceBaseline(task)) {
        const current = Number(currentOdometer)
        const baseline = Number(task.lastMaintenanceOdometer)
        const intervalKm = Number(task.intervalKm)
        if (hasOdometer(currentOdometer)
            && Number.isFinite(baseline) && baseline >= 0
            && Number.isFinite(intervalKm) && intervalKm > 0) {
            const kmSinceLast = Math.max(0, current - baseline)
            kmRemaining = Math.max(0, intervalKm - kmSinceLast)
            distanceProgress = (kmSinceLast / intervalKm) * 100

            const dailyRate = Number(averageDailyKm)
            const hasReliableUsage = [ODOMETER_CONFIDENCE_V1.BASIC, ODOMETER_CONFIDENCE_V1.GOOD].includes(usageConfidence)
            if (hasReliableUsage && Number.isFinite(dailyRate) && dailyRate > 0 && kmRemaining > 0) {
                const daysRemaining = kmRemaining / dailyRate
                if (Number.isFinite(daysRemaining) && daysRemaining > 0) {
                    const forecast = today.add(Math.ceil(daysRemaining), 'day')
                    if (forecast.isValid()) {
                        estimatedDate = forecast.toISOString()
                        estimatedDateSource = 'distance'
                    }
                }
            }
        }
    }

    if (taskNeedsTimeBaseline(task)) {
        const lastDate = dayjs(task.lastMaintenanceDate)
        const intervalMonths = Number(task.intervalMonths)
        if (lastDate.isValid() && Number.isFinite(intervalMonths) && intervalMonths > 0) {
            timeProgress = (today.diff(lastDate, 'month', true) / intervalMonths) * 100
            const nextDueDate = lastDate.add(intervalMonths, 'month')
            if (nextDueDate.isValid() && (!estimatedDate || nextDueDate.isBefore(dayjs(estimatedDate)))) {
                estimatedDate = nextDueDate.toISOString()
                estimatedDateSource = 'time'
            }
        }
    }

    const rawProgress = Math.max(distanceProgress, timeProgress)
    const progress = Number.isFinite(rawProgress) ? rawProgress : 0
    if (task.snoozedUntil && dayjs(task.snoozedUntil).isAfter(today)) {
        return {
            status: TASK_STATUS_V1.GOOD,
            progress: Math.min(progress, 100),
            isSnoozed: true,
            needsSetup: false,
            snoozedUntil: task.snoozedUntil,
            kmRemaining,
            distanceProgress,
            timeProgress,
            estimatedDate,
            estimatedDateSource
        }
    }

    let status = TASK_STATUS_V1.GOOD
    if (progress >= 100) status = TASK_STATUS_V1.LATE
    else if (progress >= 90) status = TASK_STATUS_V1.DUE
    else if (progress >= 75) status = TASK_STATUS_V1.SOON

    return {
        status,
        progress: Math.min(progress, 150),
        isSnoozed: false,
        needsSetup: false,
        distanceProgress,
        timeProgress,
        estimatedDate,
        estimatedDateSource,
        kmRemaining,
        hasNoMaintenanceHistory: false
    }
}
