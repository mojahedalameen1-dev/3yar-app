import { describe, expect, it } from 'vitest'
import { buildActionRemindersV1, getTopDocumentActionV1 } from '../../src/lib/action-reminders-v1.js'
import { DOCUMENT_STATUS_V1 } from '../../src/lib/document-status-v1.js'

const document = (id, status, daysLeft = null, extra = {}) => ({
    id,
    typeLabel: `وثيقة ${id}`,
    statusInfo: { status, daysLeft },
    ...extra
})

const task = (id, status) => ({ id, name: `مهمة ${id}`, statusInfo: { status } })

describe('V1 client-derived action reminders', () => {
    it('creates one stable reminder per actionable document and orders by action priority', () => {
        const reminders = buildActionRemindersV1({
            documents: [
                document('valid', DOCUMENT_STATUS_V1.VALID, 60),
                document('missing', DOCUMENT_STATUS_V1.NEEDS_EXPIRY),
                document('soon', DOCUMENT_STATUS_V1.EXPIRING_SOON, 4),
                document('expired', DOCUMENT_STATUS_V1.EXPIRED, -2),
                document('expired', DOCUMENT_STATUS_V1.EXPIRED, -2)
            ]
        })

        expect(reminders.map(item => item.id)).toEqual([
            'document:expired:expiry', 'document:soon:expiry', 'document:missing:expiry'
        ])
        expect(reminders[0]).toMatchObject({ source: 'document', actionRoute: '/documents', severity: 'critical' })
        expect(reminders[2].message).toContain('أضف تاريخ الانتهاء')
    })

    it('maps late, due, and needs-setup tasks without creating soon/good reminders', () => {
        const reminders = buildActionRemindersV1({
            tasks: [
                task('later', 'good'), task('soon', 'soon'), task('setup', 'needs_setup'),
                task('due', 'due'), task('late', 'late'), task('late', 'late')
            ]
        })

        expect(reminders.map(item => item.id)).toEqual([
            'maintenance:late:action', 'maintenance:due:action', 'maintenance:setup:action'
        ])
        expect(reminders.every(item => item.actionRoute === '/tasks')).toBe(true)
    })

    it('keeps announcements and reminders as independent inputs when either source is empty', () => {
        const reminder = buildActionRemindersV1({
            documents: [document('expired', DOCUMENT_STATUS_V1.EXPIRED, -1)],
            tasks: []
        })
        const noReminder = buildActionRemindersV1({ documents: [], tasks: [] })
        const announcements = [{ id: 'announcement-1', title: 'إعلان' }]

        expect(reminder).toHaveLength(1)
        expect(announcements).toHaveLength(1)
        expect(noReminder).toEqual([])
        expect(announcements).toHaveLength(1)
    })

    it('selects only the highest-priority document action for the dashboard', () => {
        const top = getTopDocumentActionV1([
            document('missing', DOCUMENT_STATUS_V1.NEEDS_EXPIRY),
            document('soon', DOCUMENT_STATUS_V1.EXPIRING_SOON, 2),
            document('expired', DOCUMENT_STATUS_V1.EXPIRED, -10),
            document('valid', DOCUMENT_STATUS_V1.VALID, 100)
        ])
        expect(top.id).toBe('expired')
        expect(getTopDocumentActionV1([document('valid', DOCUMENT_STATUS_V1.VALID, 100)])).toBeNull()
    })
})
