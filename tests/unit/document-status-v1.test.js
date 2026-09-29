import { describe, expect, it } from 'vitest'
import {
    DEFAULT_DOCUMENT_REMINDER_DAYS_V1,
    DOCUMENT_STATUS_V1,
    formatDocumentDaysTextV1,
    getDocumentStatusV1,
    isIssueDateAfterExpiryDateV1,
    normalizeReminderDaysV1
} from '../../src/lib/document-status-v1.js'

const now = new Date(2026, 8, 26, 23, 45)

describe('V1 document expiry status', () => {
    it('marks missing, invalid, and malformed expiry dates as unknown rather than valid', () => {
        for (const expiryDate of [undefined, null, '', 'not-a-date']) {
            expect(getDocumentStatusV1({ expiryDate, now }).status).toBe(DOCUMENT_STATUS_V1.NEEDS_EXPIRY)
        }
    })

    it('uses calendar-day boundaries so a document expiring today is not treated as yesterday', () => {
        expect(getDocumentStatusV1({ expiryDate: '2026-09-26', now })).toMatchObject({
            status: DOCUMENT_STATUS_V1.EXPIRING_SOON,
            daysLeft: 0
        })
        expect(getDocumentStatusV1({ expiryDate: '2026-09-25', now })).toMatchObject({
            status: DOCUMENT_STATUS_V1.EXPIRED,
            daysLeft: -1
        })
    })

    it('uses the per-document reminder threshold and treats a zero-day threshold as valid', () => {
        expect(getDocumentStatusV1({ expiryDate: '2026-10-03', reminderDays: 7, now }).status)
            .toBe(DOCUMENT_STATUS_V1.EXPIRING_SOON)
        expect(getDocumentStatusV1({ expiryDate: '2026-10-04', reminderDays: 7, now }).status)
            .toBe(DOCUMENT_STATUS_V1.VALID)
        expect(getDocumentStatusV1({ expiryDate: '2026-09-26', reminderDays: 0, now }).status)
            .toBe(DOCUMENT_STATUS_V1.EXPIRING_SOON)
    })

    it('falls back to 30 days for missing or invalid thresholds without writing to source data', () => {
        expect(normalizeReminderDaysV1(undefined)).toBe(DEFAULT_DOCUMENT_REMINDER_DAYS_V1)
        expect(normalizeReminderDaysV1(null)).toBe(DEFAULT_DOCUMENT_REMINDER_DAYS_V1)
        expect(normalizeReminderDaysV1('')).toBe(DEFAULT_DOCUMENT_REMINDER_DAYS_V1)
        expect(normalizeReminderDaysV1(-1)).toBe(DEFAULT_DOCUMENT_REMINDER_DAYS_V1)
        expect(normalizeReminderDaysV1('bad')).toBe(DEFAULT_DOCUMENT_REMINDER_DAYS_V1)
        expect(getDocumentStatusV1({ expiryDate: '2026-10-26', now }).status)
            .toBe(DOCUMENT_STATUS_V1.EXPIRING_SOON)
        expect(getDocumentStatusV1({ expiryDate: '2026-10-27', now }).status)
            .toBe(DOCUMENT_STATUS_V1.VALID)
    })

    it('rejects an issue date after expiry but allows matching calendar dates', () => {
        expect(isIssueDateAfterExpiryDateV1('2026-10-02', '2026-10-01')).toBe(true)
        expect(isIssueDateAfterExpiryDateV1('2026-10-01T22:00:00', '2026-10-01T02:00:00')).toBe(false)
        expect(isIssueDateAfterExpiryDateV1('', '2026-10-01')).toBe(false)
    })

    it('formats due-today, upcoming, and expired messages without negative user-facing values', () => {
        expect(formatDocumentDaysTextV1(0)).toBe('تنتهي اليوم')
        expect(formatDocumentDaysTextV1(1)).toBe('متبقي يوم')
        expect(formatDocumentDaysTextV1(-3)).toContain('منتهية منذ')
        expect(formatDocumentDaysTextV1(Number.NaN)).toBe('')
    })
})
