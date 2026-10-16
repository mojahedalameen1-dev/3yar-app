import { getDocumentStatusV1 } from '../src/lib/document-status-v1.js'

export const PUBLIC_MAINTENANCE_LIMIT = 100
export const PUBLIC_VEHICLE_DOCUMENTS = Object.freeze([
    { type: 'registration', label: 'استمارة السيارة' },
    { type: 'fahas', label: 'الفحص الدوري' },
    { type: 'insurance', label: 'التأمين' }
])

function publicText(value, fallback = '') {
    return typeof value === 'string' ? value.replace(/\p{Cc}/gu, ' ').trim().slice(0, 160) : fallback
}

function publicNumber(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null
    if (typeof value === 'string' && !value.trim()) return null
    const number = Number(value)
    return Number.isFinite(number) && number >= 0 ? number : null
}

function publicDate(value) {
    let date = null
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(value)) date = new Date(value)
    else if (value instanceof Date) date = value
    else if (typeof value?.toDate === 'function') date = value.toDate()
    return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null
}

export function buildPublicPassport(car, records, documentRows, { now = new Date(), truncated = false } = {}) {
    // Create a new allowlisted DTO. Never spread a stored document or snapshot.
    const maintenance = records.slice(0, PUBLIC_MAINTENANCE_LIMIT).map(record => ({
        name: publicText(record.task_name, 'صيانة'),
        date: publicDate(record.date),
        odometerReading: publicNumber(record.odometer_reading)
    }))
    const documents = PUBLIC_VEHICLE_DOCUMENTS.flatMap(({ type, label }) => {
        const document = documentRows.find(row => row.type === type)
        if (!document) return []
        return [{
            type,
            label,
            status: getDocumentStatusV1({ expiryDate: document.expiry_date, reminderDays: document.reminder_days, now }).status
        }]
    })
    return {
        car: {
            make: publicText(car.make),
            model: publicText(car.model),
            year: publicNumber(car.year),
            color: publicText(car.color),
            currentOdometer: publicNumber(car.current_odometer)
        },
        maintenance,
        documents,
        summary: {
            maintenanceCount: maintenance.length,
            lastMaintenanceDate: maintenance.map(record => record.date).filter(Boolean).sort().at(-1) || null
        },
        truncated: truncated || records.length > PUBLIC_MAINTENANCE_LIMIT
    }
}
