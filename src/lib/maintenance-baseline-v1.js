import dayjs from 'dayjs'

export const MAINTENANCE_BASELINE_TYPE = Object.freeze({
    REPORTED_MAINTENANCE: 'reported_maintenance',
    MAINTENANCE_RECORD: 'maintenance_record',
    TRACKING_START: 'tracking_start',
    UNKNOWN: 'unknown'
})

export function taskNeedsDistanceBaseline(task) {
    return (task.type === 'distance' || task.type === 'both')
        && Number.isFinite(Number(task.intervalKm))
        && Number(task.intervalKm) > 0
}

export function taskNeedsTimeBaseline(task) {
    return (task.type === 'time' || task.type === 'both')
        && Number.isFinite(Number(task.intervalMonths))
        && Number(task.intervalMonths) > 0
}

function validOdometer(value) {
    return value !== null && value !== undefined && value !== ''
        && Number.isFinite(Number(value)) && Number(value) >= 0
}

function dateOnlyToIso(value) {
    return `${value}T00:00:00.000Z`
}

export function buildMaintenanceBaselineV1({
    task,
    choice,
    lastMaintenanceDate,
    lastMaintenanceOdometer,
    currentOdometer = 0,
    today = new Date()
}) {
    if (choice === 'unknown') {
        return {
            baselineType: MAINTENANCE_BASELINE_TYPE.UNKNOWN,
            lastMaintenanceDate: null,
            lastMaintenanceOdometer: null
        }
    }

    if (choice === 'tracking_start') {
        if (taskNeedsDistanceBaseline(task) && !validOdometer(currentOdometer)) {
            throw new Error('تعذر تحديد قراءة العداد الحالية.')
        }
        return {
            baselineType: MAINTENANCE_BASELINE_TYPE.TRACKING_START,
            lastMaintenanceDate: today.toISOString(),
            lastMaintenanceOdometer: taskNeedsDistanceBaseline(task) ? Number(currentOdometer) : null
        }
    }

    if (choice !== 'maintenance') throw new Error('اختر طريقة إعداد خط الأساس.')

    const parsedDate = lastMaintenanceDate ? dayjs(`${lastMaintenanceDate}T00:00:00`) : null
    if (!/^\d{4}-\d{2}-\d{2}$/.test(lastMaintenanceDate || '')
        || !parsedDate?.isValid()
        || parsedDate.format('YYYY-MM-DD') !== lastMaintenanceDate) {
        throw new Error('أدخل تاريخ آخر صيانة.')
    }

    const maintenanceDate = new Date(dateOnlyToIso(lastMaintenanceDate))
    if (Number.isNaN(maintenanceDate.getTime()) || lastMaintenanceDate > dayjs(today).format('YYYY-MM-DD')) {
        throw new Error('تاريخ آخر صيانة يجب ألا يكون في المستقبل.')
    }

    let odometer = null
    if (taskNeedsDistanceBaseline(task)) {
        if (!validOdometer(lastMaintenanceOdometer)) {
            throw new Error('أدخل قراءة العداد وقت آخر صيانة.')
        }
        if (Number(lastMaintenanceOdometer) > Number(currentOdometer)) {
            throw new Error('قراءة آخر صيانة لا يمكن أن تتجاوز العداد الحالي للسيارة.')
        }
        odometer = Number(lastMaintenanceOdometer)
    }

    return {
        baselineType: MAINTENANCE_BASELINE_TYPE.REPORTED_MAINTENANCE,
        lastMaintenanceDate: maintenanceDate.toISOString(),
        lastMaintenanceOdometer: odometer
    }
}
