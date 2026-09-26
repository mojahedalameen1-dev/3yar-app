import { DOCUMENT_STATUS_V1, formatDocumentDaysTextV1 } from './document-status-v1'

const DOCUMENT_PRIORITY = Object.freeze({
    [DOCUMENT_STATUS_V1.EXPIRED]: 0,
    [DOCUMENT_STATUS_V1.EXPIRING_SOON]: 1,
    [DOCUMENT_STATUS_V1.NEEDS_EXPIRY]: 2
})

const TASK_REMINDER_STATUS = Object.freeze({
    late: { severity: 'critical', message: 'مهمة الصيانة متأخرة وتحتاج متابعة.' },
    due: { severity: 'warning', message: 'حان موعد متابعة مهمة الصيانة.' },
    needs_setup: { severity: 'info', message: 'أكمل بيانات آخر صيانة لتفعيل المتابعة.' }
})

function documentTitle(document) {
    return document?.typeLabel || document?.title || 'وثيقة السيارة'
}

export function buildActionRemindersV1({ documents = [], tasks = [] } = {}) {
    const reminders = []
    const seen = new Set()

    for (const document of documents) {
        const status = document?.statusInfo?.status
        if (!Object.hasOwn(DOCUMENT_PRIORITY, status) || !document?.id) continue
        const id = `document:${document.id}:expiry`
        if (seen.has(id)) continue
        seen.add(id)

        const title = documentTitle(document)
        let message
        if (status === DOCUMENT_STATUS_V1.NEEDS_EXPIRY) {
            message = 'أضف تاريخ الانتهاء لعرض حالة الوثيقة بدقة.'
        } else if (status === DOCUMENT_STATUS_V1.EXPIRED) {
            message = formatDocumentDaysTextV1(document.statusInfo.daysLeft)
        } else {
            message = formatDocumentDaysTextV1(document.statusInfo.daysLeft)
        }

        reminders.push({
            id,
            source: 'document',
            sourceId: String(document.id),
            severity: status === DOCUMENT_STATUS_V1.EXPIRED ? 'critical'
                : status === DOCUMENT_STATUS_V1.EXPIRING_SOON ? 'warning' : 'info',
            status,
            title,
            message,
            actionRoute: '/documents',
            priority: DOCUMENT_PRIORITY[status],
            daysLeft: document.statusInfo.daysLeft
        })
    }

    for (const task of tasks) {
        const status = task?.statusInfo?.status
        const reminder = TASK_REMINDER_STATUS[status]
        if (!reminder || !task?.id) continue
        const id = `maintenance:${task.id}:action`
        if (seen.has(id)) continue
        seen.add(id)
        reminders.push({
            id,
            source: 'maintenance',
            sourceId: String(task.id),
            severity: reminder.severity,
            status,
            title: task.name || 'مهمة صيانة',
            message: reminder.message,
            actionRoute: '/tasks',
            priority: status === 'late' ? 0 : status === 'due' ? 1 : 2
        })
    }

    return reminders.sort((a, b) => a.priority - b.priority
        || (a.daysLeft ?? Number.POSITIVE_INFINITY) - (b.daysLeft ?? Number.POSITIVE_INFINITY)
        || a.title.localeCompare(b.title, 'ar'))
}

export function getTopDocumentActionV1(documents = []) {
    const actionable = documents.filter(document => Object.hasOwn(DOCUMENT_PRIORITY, document?.statusInfo?.status))
    return actionable.sort((a, b) => DOCUMENT_PRIORITY[a.statusInfo.status] - DOCUMENT_PRIORITY[b.statusInfo.status]
        || (a.statusInfo.daysLeft ?? Number.POSITIVE_INFINITY) - (b.statusInfo.daysLeft ?? Number.POSITIVE_INFINITY)
        || documentTitle(a).localeCompare(documentTitle(b), 'ar'))[0] || null
}
