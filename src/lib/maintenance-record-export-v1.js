import { normalizeKnownCostV1, parseMaintenanceRecordDateV1 } from './maintenance-cost-insights-v1'

export const MAINTENANCE_RECORD_CSV_HEADERS_V1 = [
    'نوع الصيانة',
    'التاريخ',
    'العداد',
    'التكلفة',
    'مركز الصيانة',
    'رقم الفاتورة',
    'ملاحظات'
]

export function escapeCsvCellV1(value) {
    const text = value === null || value === undefined ? '' : String(value)
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function formatCsvDate(value) {
    const date = parseMaintenanceRecordDateV1(value)
    if (!date) return ''
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${day}/${month}/${date.getFullYear()}`
}

export function maintenanceRecordsToCsvV1(records = []) {
    const rows = [MAINTENANCE_RECORD_CSV_HEADERS_V1]

    for (const record of Array.isArray(records) ? records : []) {
        const cost = normalizeKnownCostV1(record?.cost)
        rows.push([
            record?.taskName,
            formatCsvDate(record?.date),
            record?.odometerReading,
            cost,
            record?.serviceCenter,
            record?.invoiceNumber,
            record?.notes
        ])
    }

    return `\ufeff${rows.map(row => row.map(escapeCsvCellV1).join(',')).join('\r\n')}`
}
