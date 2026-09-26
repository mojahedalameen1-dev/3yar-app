import dayjs from 'dayjs'

export const DOCUMENT_STATUS_V1 = Object.freeze({
    NEEDS_EXPIRY: 'needs_expiry',
    EXPIRED: 'expired',
    EXPIRING_SOON: 'expiring_soon',
    VALID: 'valid'
})

export const DOCUMENT_STATUS_LABELS_V1 = Object.freeze({
    [DOCUMENT_STATUS_V1.NEEDS_EXPIRY]: 'تحتاج تاريخ انتهاء',
    [DOCUMENT_STATUS_V1.EXPIRED]: 'منتهية',
    [DOCUMENT_STATUS_V1.EXPIRING_SOON]: 'قربت تنتهي',
    [DOCUMENT_STATUS_V1.VALID]: 'سارية'
})

export const DEFAULT_DOCUMENT_REMINDER_DAYS_V1 = 30

export function normalizeReminderDaysV1(value) {
    if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) {
        return DEFAULT_DOCUMENT_REMINDER_DAYS_V1
    }
    if (typeof value !== 'number' && typeof value !== 'string') return DEFAULT_DOCUMENT_REMINDER_DAYS_V1
    const days = Number(value)
    return Number.isFinite(days) && Number.isInteger(days) && days >= 0
        ? days
        : DEFAULT_DOCUMENT_REMINDER_DAYS_V1
}

export function getDocumentStatusV1({ expiryDate, reminderDays, now = new Date() } = {}) {
    const thresholdDays = normalizeReminderDaysV1(reminderDays)
    if (expiryDate === null || expiryDate === undefined || expiryDate === '') {
        return { status: DOCUMENT_STATUS_V1.NEEDS_EXPIRY, daysLeft: null, reminderDays: thresholdDays }
    }

    const expiry = dayjs(expiryDate)
    const today = dayjs(now)
    if (!expiry.isValid() || !today.isValid()) {
        return { status: DOCUMENT_STATUS_V1.NEEDS_EXPIRY, daysLeft: null, reminderDays: thresholdDays }
    }

    const daysLeft = expiry.startOf('day').diff(today.startOf('day'), 'day')
    if (!Number.isFinite(daysLeft)) {
        return { status: DOCUMENT_STATUS_V1.NEEDS_EXPIRY, daysLeft: null, reminderDays: thresholdDays }
    }
    if (daysLeft < 0) return { status: DOCUMENT_STATUS_V1.EXPIRED, daysLeft, reminderDays: thresholdDays }
    if (daysLeft <= thresholdDays) return { status: DOCUMENT_STATUS_V1.EXPIRING_SOON, daysLeft, reminderDays: thresholdDays }
    return { status: DOCUMENT_STATUS_V1.VALID, daysLeft, reminderDays: thresholdDays }
}

export function isIssueDateAfterExpiryDateV1(issueDate, expiryDate) {
    if (!issueDate || !expiryDate) return false
    const issue = dayjs(issueDate)
    const expiry = dayjs(expiryDate)
    if (!issue.isValid() || !expiry.isValid()) return false
    return issue.startOf('day').isAfter(expiry.startOf('day'))
}

export function formatDocumentDaysTextV1(daysLeft) {
    const value = Number(daysLeft)
    if (!Number.isFinite(value)) return ''
    if (value === 0) return 'تنتهي اليوم'
    const count = Math.abs(value).toLocaleString('ar-SA')
    let amount
    if (Math.abs(value) === 1) amount = 'يوم'
    else if (Math.abs(value) === 2) amount = 'يومين'
    else if (Math.abs(value) >= 3 && Math.abs(value) <= 10) amount = `${count} أيام`
    else amount = `${count} يومًا`
    return value < 0 ? `منتهية منذ ${amount}` : `متبقي ${amount}`
}
