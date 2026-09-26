import { buildActionRemindersV1 } from './action-reminders-v1'
import { DOCUMENT_STATUS_V1 } from './document-status-v1'
import { ODOMETER_CONFIDENCE_V1 } from './odometer-insights-v1'
import { normalizeKnownCostV1 } from './maintenance-cost-insights-v1'

const DAY_MS = 24 * 60 * 60 * 1000
const ODOMETER_STALE_DAYS_V1 = 30

export const DASHBOARD_ACTION_PRIORITY_V1 = Object.freeze({
    MAINTENANCE_LATE: 0,
    DOCUMENT_EXPIRED: 1,
    MAINTENANCE_DUE: 2,
    DOCUMENT_EXPIRING_SOON: 3,
    MAINTENANCE_NEEDS_SETUP: 4,
    DOCUMENT_NEEDS_EXPIRY: 5,
    ODOMETER_IMPROVEMENT: 6
})

export const DASHBOARD_ACTIONS_VISIBLE_LIMIT_V1 = 3

export const DASHBOARD_QUICK_ACTIONS_V1 = Object.freeze([
    { id: 'odometer', title: 'تحديث العداد', icon: 'mdi-speedometer', kind: 'odometer' },
    { id: 'maintenance', title: 'تسجيل صيانة', icon: 'mdi-wrench-clock', route: { name: 'tasks' } },
    { id: 'document', title: 'إضافة وثيقة', icon: 'mdi-file-plus-outline', route: { name: 'documents' } }
])

function dateValue(value) {
    try {
        if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null
        if (value && typeof value.toDate === 'function') return dateValue(value.toDate())
        if (value && Number.isFinite(value.seconds ?? value._seconds)) {
            return dateValue(new Date(Number(value.seconds ?? value._seconds) * 1000))
        }
        if (typeof value === 'number' && Number.isFinite(value)) return dateValue(new Date(value))
        if (typeof value === 'string' && value.trim()) return dateValue(new Date(value))
    } catch {
        return null
    }
    return null
}

function documentDisplayName(document) {
    const name = String(document?.typeLabel || document?.title || '').trim()
    return name || 'وثيقة السيارة'
}

function actionPriority(reminder) {
    if (reminder.source === 'maintenance') {
        if (reminder.status === 'late') return DASHBOARD_ACTION_PRIORITY_V1.MAINTENANCE_LATE
        if (reminder.status === 'due') return DASHBOARD_ACTION_PRIORITY_V1.MAINTENANCE_DUE
        return DASHBOARD_ACTION_PRIORITY_V1.MAINTENANCE_NEEDS_SETUP
    }
    if (reminder.status === DOCUMENT_STATUS_V1.EXPIRED) return DASHBOARD_ACTION_PRIORITY_V1.DOCUMENT_EXPIRED
    if (reminder.status === DOCUMENT_STATUS_V1.EXPIRING_SOON) return DASHBOARD_ACTION_PRIORITY_V1.DOCUMENT_EXPIRING_SOON
    return DASHBOARD_ACTION_PRIORITY_V1.DOCUMENT_NEEDS_EXPIRY
}

function actionSecondaryValue(action, source) {
    const rawProgress = source?.statusInfo?.progress
    if (action.status === 'late' && rawProgress !== null && rawProgress !== undefined && rawProgress !== '') {
        const progress = Number(rawProgress)
        if (Number.isFinite(progress)) return -progress
    }
    if (action.status === 'due') {
        if (rawProgress !== null && rawProgress !== undefined && rawProgress !== '') {
            const progress = Number(rawProgress)
            if (Number.isFinite(progress)) return -progress
        }
        const rawKmRemaining = source?.statusInfo?.kmRemaining
        if (rawKmRemaining !== null && rawKmRemaining !== undefined && rawKmRemaining !== '') {
            const kmRemaining = Number(rawKmRemaining)
            if (Number.isFinite(kmRemaining)) return kmRemaining
        }
        const estimatedAt = dateValue(source?.statusInfo?.estimatedDate)
        return estimatedAt?.getTime() ?? Number.POSITIVE_INFINITY
    }
    const rawDaysLeft = source?.statusInfo?.daysLeft
    if (action.source === 'document' && rawDaysLeft !== null && rawDaysLeft !== undefined && rawDaysLeft !== '') {
        const daysLeft = Number(rawDaysLeft)
        if (Number.isFinite(daysLeft)) return daysLeft
    }
    return 0
}

function toDashboardAction(reminder, source) {
    const sortPriority = actionPriority(reminder)
    if (reminder.source === 'maintenance') {
        const needsSetup = reminder.status === 'needs_setup'
        const title = reminder.status === 'late'
            ? `${reminder.title} متأخر`
            : reminder.status === 'due'
                ? `${reminder.title} مستحق الآن`
                : `${reminder.title} يحتاج إعداد`

        return {
            id: reminder.id,
            source: 'maintenance',
            sourceId: reminder.sourceId,
            status: reminder.status,
            severity: reminder.severity,
            title,
            message: reminder.message,
            actionLabel: needsSetup ? 'إعداد الآن' : 'عرض المهمة',
            actionRoute: needsSetup
                ? { name: 'tasks', query: { filter: 'needs_setup' } }
                : { name: 'tasks' },
            actionKind: 'navigate',
            sortPriority,
            sortSecondary: actionSecondaryValue(reminder, source)
        }
    }

    const name = documentDisplayName(source)
    const title = reminder.status === DOCUMENT_STATUS_V1.EXPIRED
        ? `وثيقة منتهية: ${name}`
        : reminder.status === DOCUMENT_STATUS_V1.EXPIRING_SOON
            ? `وثيقة قريبة الانتهاء: ${name}`
            : `أضف تاريخ انتهاء: ${name}`
    const needsExpiry = reminder.status === DOCUMENT_STATUS_V1.NEEDS_EXPIRY

    return {
        id: reminder.id,
        source: 'document',
        sourceId: reminder.sourceId,
        status: reminder.status,
        severity: reminder.severity,
        title,
        message: reminder.message,
        actionLabel: needsExpiry ? 'إعداد الآن' : 'عرض الوثيقة',
        actionRoute: { name: 'documents' },
        actionKind: 'navigate',
        sortPriority,
        sortSecondary: actionSecondaryValue(reminder, source)
    }
}

function compareActions(left, right) {
    return left.sortPriority - right.sortPriority
        || left.sortSecondary - right.sortSecondary
        || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
}

/** Build a deterministic, derived-only action list from existing V1 status projections. */
export function buildDashboardActionsV1({
    tasks = [],
    documents = [],
    maintenanceState = 'available',
    documentsState = 'available',
    odometerInsights = null,
    latestOdometerDate = null,
    now = new Date()
} = {}) {
    const usableTasks = maintenanceState === 'unavailable' ? [] : (Array.isArray(tasks) ? tasks : [])
    const usableDocuments = documentsState === 'unavailable' ? [] : (Array.isArray(documents) ? documents : [])
    const tasksById = new Map(usableTasks.map(task => [String(task.id), task]))
    const documentsById = new Map(usableDocuments.map(document => [String(document.id), document]))
    const seen = new Set()

    const actions = buildActionRemindersV1({ tasks: usableTasks, documents: usableDocuments })
        .filter(reminder => {
            if (seen.has(reminder.id)) return false
            seen.add(reminder.id)
            return true
        })
        .map(reminder => {
            const source = reminder.source === 'maintenance'
                ? tasksById.get(String(reminder.sourceId))
                : documentsById.get(String(reminder.sourceId))
            return toDashboardAction(reminder, source)
        })

    const latest = dateValue(latestOdometerDate)
    const current = dateValue(now)
    if (odometerInsights?.confidence === ODOMETER_CONFIDENCE_V1.INSUFFICIENT && latest && current) {
        const latestDay = Date.UTC(latest.getFullYear(), latest.getMonth(), latest.getDate())
        const currentDay = Date.UTC(current.getFullYear(), current.getMonth(), current.getDate())
        const staleDays = Math.floor((currentDay - latestDay) / DAY_MS)
        if (staleDays >= ODOMETER_STALE_DAYS_V1) {
            actions.push({
                id: 'odometer:stale-reading',
                source: 'odometer',
                sourceId: 'latest-reading',
                status: 'insufficient',
                severity: 'info',
                title: 'حدّث قراءة العداد',
                message: `آخر قراءة مسجلة منذ ${staleDays.toLocaleString('ar-SA')} يومًا؛ أضف قراءة جديدة لتحسين توقعات الصيانة.`,
                actionLabel: 'تحديث العداد',
                actionRoute: { name: 'dashboard' },
                actionKind: 'odometer',
                sortPriority: DASHBOARD_ACTION_PRIORITY_V1.ODOMETER_IMPROVEMENT,
                sortSecondary: staleDays
            })
        }
    }

    return actions.sort(compareActions).map(action => {
        const publicAction = { ...action }
        delete publicAction.sortSecondary
        return publicAction
    })
}

export function getVisibleDashboardActionsV1(actions = [], showAll = false) {
    const safeActions = Array.isArray(actions) ? actions : []
    return showAll ? safeActions : safeActions.slice(0, DASHBOARD_ACTIONS_VISIBLE_LIMIT_V1)
}

export function getDashboardActionCenterStateV1({ actions = [], maintenanceState = 'available', documentsState = 'available' } = {}) {
    if (Array.isArray(actions) && actions.length > 0) return 'actions'
    if (maintenanceState === 'loading' || documentsState === 'loading') return 'loading'
    if (['unavailable', 'degraded'].includes(maintenanceState) || ['unavailable', 'degraded'].includes(documentsState)) {
        return 'partial-empty'
    }
    return 'empty'
}

export function getDashboardSourceStateV1({ loading = false, error = null, hasData = false } = {}) {
    if (error) return hasData ? 'degraded' : 'unavailable'
    if (loading && !hasData) return 'loading'
    return 'available'
}

/** Uses already-computed task status/forecast values; it never calculates status itself. */
export function getDashboardNextMaintenanceV1({ tasks = [], state = 'available' } = {}) {
    if (state === 'loading') return { state: 'loading', task: null, expectedDate: null }
    if (state === 'unavailable') return { state: 'unavailable', task: null, expectedDate: null }

    const safeTasks = Array.isArray(tasks) ? tasks : []
    if (safeTasks.length === 0) return { state: 'empty', task: null, expectedDate: null }

    const allNeedSetup = safeTasks.every(task => task?.statusInfo?.status === 'needs_setup')
    if (allNeedSetup) return { state: 'needs_setup', task: null, expectedDate: null }

    const task = safeTasks.find(item => ['soon', 'good'].includes(item?.statusInfo?.status)
        && item?.statusInfo?.status !== 'needs_setup'
        && !item?.statusInfo?.isSnoozed)
    if (!task) return { state: 'handled_by_actions', task: null, expectedDate: null }

    const hasForecast = ['distance', 'time'].includes(task.statusInfo.estimatedDateSource)
    const expectedDate = hasForecast && dateValue(task.statusInfo.estimatedDate)
        ? task.statusInfo.estimatedDate
        : null

    return { state: 'ready', task, expectedDate }
}

export function getDashboardOdometerSummaryV1(insights = {}) {
    const rawAverageDailyKm = insights.averageDailyKm
    const hasReliableRate = rawAverageDailyKm !== null && rawAverageDailyKm !== undefined && rawAverageDailyKm !== ''
        && [ODOMETER_CONFIDENCE_V1.BASIC, ODOMETER_CONFIDENCE_V1.GOOD]
        .includes(insights.confidence)
        && Number.isFinite(Number(rawAverageDailyKm))

    if (!hasReliableRate) {
        return { state: 'needs_readings', message: 'أضف قراءات أخرى لتحسين توقعات الصيانة.' }
    }

    const rate = Number(insights.averageDailyKm).toLocaleString('ar-SA', { maximumFractionDigits: 1 })
    return { state: 'available', message: `متوسط استخدامك ${rate} كم/يوم.` }
}

export function getDashboardDocumentsSummaryV1({ documents = [], state = 'available' } = {}) {
    const safeDocuments = Array.isArray(documents) ? documents : []
    if (state === 'loading' && safeDocuments.length === 0) return { state: 'loading', attentionCount: null }
    if (state === 'unavailable') return { state: 'unavailable', attentionCount: null }

    if (safeDocuments.length === 0) return { state: 'empty', attentionCount: 0 }

    const attentionCount = safeDocuments.filter(document => [
        DOCUMENT_STATUS_V1.EXPIRED,
        DOCUMENT_STATUS_V1.EXPIRING_SOON,
        DOCUMENT_STATUS_V1.NEEDS_EXPIRY
    ].includes(document?.statusInfo?.status)).length

    return {
        state: attentionCount > 0 ? 'attention' : 'clear',
        attentionCount,
        isDegraded: state === 'degraded'
    }
}

export function getDashboardCostSummaryV1({ insights = {}, latestRecord = null, state = 'available' } = {}) {
    if (state === 'loading' && !insights.knownCostRecords) {
        return { state: 'loading', yearTotal: null, message: '', lastMaintenanceCost: getKnownRecordCostV1(latestRecord) }
    }
    if (state === 'unavailable') {
        return { state: 'unavailable', yearTotal: null, message: '', lastMaintenanceCost: null }
    }

    const hasYearCost = Number(insights.thisYearKnownCostRecords) > 0
    const hasAnyKnownCost = Number(insights.knownCostRecords) > 0
    return {
        state: 'available',
        yearTotal: hasYearCost ? normalizeKnownCostV1(insights.thisYearCost) : null,
        message: hasYearCost
            ? ''
            : hasAnyKnownCost
                ? 'لا توجد تكاليف مسجلة هذا العام.'
                : 'لم تُسجّل تكاليف صيانة بعد.',
        lastMaintenanceCost: getKnownRecordCostV1(latestRecord),
        isDegraded: state === 'degraded'
    }
}

export function getKnownRecordCostV1(record) {
    return normalizeKnownCostV1(record?.cost)
}

export function getDashboardPrimaryStateV1({ hasCar = false, loading = false, error = null } = {}) {
    if (hasCar) return 'dashboard'
    if (loading) return 'loading'
    if (error) return 'unavailable'
    return 'onboarding'
}
