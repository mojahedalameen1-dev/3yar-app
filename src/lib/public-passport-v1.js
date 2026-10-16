const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const DOCUMENT_LABELS = Object.freeze({
    registration: 'استمارة السيارة',
    fahas: 'الفحص الدوري',
    insurance: 'التأمين'
})
const DOCUMENT_STATUSES = new Set(['valid', 'expiring_soon', 'expired', 'needs_expiry'])

export const PUBLIC_PASSPORT_MESSAGES_V1 = Object.freeze({
    unavailable: 'رابط المشاركة غير صالح أو لم يعد متاحًا',
    error: 'تعذر تحميل جواز السيارة الآن',
    disclaimer: 'هذه البيانات أضافها مالك السيارة في عيار، ولا تمثل تحققًا رسميًا من جهة حكومية أو فنية.'
})

export function publicPassportTokenV1(hash, { legacy = false } = {}) {
    if (legacy || typeof hash !== 'string' || !hash.startsWith('#')) return null
    const token = hash.slice(1)
    return TOKEN_PATTERN.test(token) ? token : null
}

function exactKeys(value, keys) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        && Object.keys(value).length === keys.length
        && keys.every(key => Object.hasOwn(value, key))
}

function text(value) {
    return typeof value === 'string' && value.length <= 160
}

function numberOrNull(value) {
    return value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0)
}

function dateOrNull(value) {
    if (value === null) return true
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
    const date = new Date(`${value}T00:00:00Z`)
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Reject an unexpected response shape rather than accidentally rendering private fields. */
export function publicPassportPayloadV1(data) {
    if (!exactKeys(data, ['car', 'maintenance', 'documents', 'summary', 'truncated'])) return null
    if (!exactKeys(data.car, ['make', 'model', 'year', 'color', 'currentOdometer'])) return null
    if (!['make', 'model', 'color'].every(key => text(data.car[key]))) return null
    if (!numberOrNull(data.car.year) || !numberOrNull(data.car.currentOdometer)) return null
    if (!Array.isArray(data.maintenance) || data.maintenance.length > 100) return null
    if (!data.maintenance.every(row => exactKeys(row, ['name', 'date', 'odometerReading'])
        && text(row.name) && dateOrNull(row.date) && numberOrNull(row.odometerReading))) return null
    if (!Array.isArray(data.documents) || data.documents.length > 3) return null
    if (!data.documents.every(row => exactKeys(row, ['type', 'label', 'status'])
        && Object.hasOwn(DOCUMENT_LABELS, row.type)
        && row.label === DOCUMENT_LABELS[row.type] && DOCUMENT_STATUSES.has(row.status))) return null
    if (new Set(data.documents.map(row => row.type)).size !== data.documents.length) return null
    if (!exactKeys(data.summary, ['maintenanceCount', 'lastMaintenanceDate'])
        || data.summary.maintenanceCount !== data.maintenance.length
        || !dateOrNull(data.summary.lastMaintenanceDate)
        || typeof data.truncated !== 'boolean') return null

    return {
        car: {
            make: data.car.make, model: data.car.model, year: data.car.year,
            color: data.car.color, currentOdometer: data.car.currentOdometer
        },
        maintenance: data.maintenance.map(row => ({ name: row.name, date: row.date, odometerReading: row.odometerReading })),
        documents: data.documents.map(row => ({ type: row.type, label: row.label, status: row.status })),
        summary: { maintenanceCount: data.summary.maintenanceCount, lastMaintenanceDate: data.summary.lastMaintenanceDate },
        truncated: data.truncated
    }
}

export async function loadPublicPassportV1({ hash, legacy = false, fetchImpl = fetch, signal } = {}) {
    const token = publicPassportTokenV1(hash, { legacy })
    if (!token) return { state: 'unavailable', passport: null }
    try {
        const response = await fetchImpl('/api/public-passport', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
            cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error',
            ...(signal ? { signal } : {})
        })
        if (response.status === 404) return { state: 'unavailable', passport: null }
        if (!response.ok) return { state: 'error', passport: null }
        const passport = publicPassportPayloadV1(await response.json())
        return { state: passport ? 'ready' : 'error', passport }
    } catch {
        return { state: 'error', passport: null }
    }
}
