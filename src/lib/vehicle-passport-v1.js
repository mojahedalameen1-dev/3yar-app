import { calculateTaskStatusV1 } from './task-status-v1'
import { DOCUMENT_STATUS_V1, getDocumentStatusV1 } from './document-status-v1'
import { computeMaintenanceCostInsightsV1, normalizeKnownCostV1, parseMaintenanceRecordDateV1 } from './maintenance-cost-insights-v1'
import { calculateOdometerInsightsV1 } from './odometer-insights-v1'

const TASK_ORDER = Object.freeze({ late: 0, due: 1, soon: 2, needs_setup: 3, good: 4 })

function scopedRows(rows, userId, carId) {
    return (Array.isArray(rows) ? rows : []).filter(row => row?.user_id === userId && row?.car_id === carId)
}

function positiveNumber(value) {
    if (value === null || value === undefined || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) && number >= 0 ? number : null
}

/** Private owner-only projection. Never use this model in a public API or page. */
export function buildOwnerVehiclePassportV1({ userId, car, tasks = [], records = [], documents = [], readings = [], now = new Date() } = {}) {
    if (!userId || !car?.id || car.user_id !== userId || car.deletion_requested === true) return null

    const usage = calculateOdometerInsightsV1(scopedRows(readings, userId, car.id), { now })

    const ownerRecords = scopedRows(records, userId, car.id).map(row => ({
        id: row.id,
        taskName: row.task_name || 'صيانة',
        date: row.date,
        odometerReading: positiveNumber(row.odometer_reading),
        cost: normalizeKnownCostV1(row.cost)
    })).sort((left, right) => (parseMaintenanceRecordDateV1(right.date)?.getTime() ?? -Infinity)
        - (parseMaintenanceRecordDateV1(left.date)?.getTime() ?? -Infinity))

    const ownerTasks = scopedRows(tasks, userId, car.id).map(row => {
        const task = {
            id: row.id,
            name: row.name || 'مهمة صيانة',
            type: row.type,
            intervalKm: row.interval_km,
            intervalMonths: row.interval_months,
            lastMaintenanceDate: row.last_maintenance_date,
            lastMaintenanceOdometer: row.last_maintenance_odometer,
            baselineType: row.baseline_type || null,
            snoozedUntil: row.snoozed_until
        }
        return { ...task, statusInfo: calculateTaskStatusV1(task, {
            currentOdometer: car.current_odometer,
            averageDailyKm: usage.averageDailyKm,
            usageConfidence: usage.confidence,
            now
        }) }
    }).sort((left, right) => TASK_ORDER[left.statusInfo.status] - TASK_ORDER[right.statusInfo.status]
        || right.statusInfo.progress - left.statusInfo.progress
        || String(left.id).localeCompare(String(right.id)))

    const documentCounts = { valid: 0, expiringSoon: 0, expired: 0, needsExpiry: 0, total: 0 }
    const statusKeys = {
        [DOCUMENT_STATUS_V1.VALID]: 'valid',
        [DOCUMENT_STATUS_V1.EXPIRING_SOON]: 'expiringSoon',
        [DOCUMENT_STATUS_V1.EXPIRED]: 'expired',
        [DOCUMENT_STATUS_V1.NEEDS_EXPIRY]: 'needsExpiry'
    }
    for (const document of scopedRows(documents, userId, car.id)) {
        const status = getDocumentStatusV1({ expiryDate: document.expiry_date, reminderDays: document.reminder_days, now }).status
        documentCounts[statusKeys[status]] += 1
        documentCounts.total += 1
    }

    const costs = computeMaintenanceCostInsightsV1(ownerRecords, now)
    const actionTask = ownerTasks.find(task => !task.statusInfo.isSnoozed && ['late', 'due', 'needs_setup'].includes(task.statusInfo.status)) || null
    const nextMaintenance = ownerTasks.filter(task => !task.statusInfo.isSnoozed && ['soon', 'good'].includes(task.statusInfo.status))
        .sort((left, right) => (parseMaintenanceRecordDateV1(left.statusInfo.estimatedDate)?.getTime() ?? Infinity)
            - (parseMaintenanceRecordDateV1(right.statusInfo.estimatedDate)?.getTime() ?? Infinity)
            || (left.statusInfo.kmRemaining ?? Infinity) - (right.statusInfo.kmRemaining ?? Infinity))[0] || null

    return {
        car: {
            id: car.id,
            make: car.make || '',
            model: car.model || '',
            year: car.year ?? null,
            color: car.color || '',
            currentOdometer: positiveNumber(car.current_odometer),
            vin: car.vin || '',
            plateNumber: car.plate_number || ''
        },
        maintenance: { actionTask, nextMaintenance, tasksCount: ownerTasks.length },
        history: { recent: ownerRecords.slice(0, 5), count: ownerRecords.length },
        documents: documentCounts,
        costs: {
            year: parseMaintenanceRecordDateV1(now)?.getFullYear() ?? new Date().getFullYear(),
            thisYear: costs.thisYearKnownCostRecords ? costs.thisYearCost : null,
            totalKnown: costs.knownCostRecords ? costs.totalKnownCost : null,
            unknownCount: costs.unknownCostRecords
        }
    }
}
