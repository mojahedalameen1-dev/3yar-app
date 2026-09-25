import dayjs from 'dayjs'
import { MAINTENANCE_BASELINE_TYPE, taskNeedsDistanceBaseline, taskNeedsTimeBaseline } from './maintenance-baseline-v1'

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
    currentOdometer = 0,
    averageDailyKm = 0,
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
            kmRemaining: null,
            distanceProgress: null,
            timeProgress: null
        }
    }

    const today = dayjs(now)
    let distanceProgress = 0
    let timeProgress = 0
    let estimatedDate = null
    let kmRemaining = null

    if (taskNeedsDistanceBaseline(task)) {
        const kmSinceLast = Math.max(0, Number(currentOdometer || 0) - Number(task.lastMaintenanceOdometer))
        kmRemaining = Math.max(0, Number(task.intervalKm) - kmSinceLast)
        distanceProgress = (kmSinceLast / Number(task.intervalKm)) * 100

        if (averageDailyKm > 0 && kmRemaining > 0) {
            estimatedDate = today.add(Math.ceil(kmRemaining / averageDailyKm), 'day').toISOString()
        }
    }

    if (taskNeedsTimeBaseline(task)) {
        const lastDate = dayjs(task.lastMaintenanceDate)
        timeProgress = (today.diff(lastDate, 'month', true) / Number(task.intervalMonths)) * 100
        const nextDueDate = lastDate.add(Number(task.intervalMonths), 'month')
        if (!estimatedDate || nextDueDate.isBefore(dayjs(estimatedDate))) {
            estimatedDate = nextDueDate.toISOString()
        }
    }

    const progress = Math.max(distanceProgress, timeProgress)
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
            estimatedDate
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
        kmRemaining,
        hasNoMaintenanceHistory: false
    }
}
