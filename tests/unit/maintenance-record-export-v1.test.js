import { describe, expect, it } from 'vitest'
import { escapeCsvCellV1, maintenanceRecordsToCsvV1 } from '../../src/lib/maintenance-record-export-v1.js'

describe('V1 maintenance record CSV export', () => {
    it('escapes commas, quotes, and newlines according to CSV cell rules', () => {
        expect(escapeCsvCellV1('مركز، فرع')).toBe('مركز، فرع')
        expect(escapeCsvCellV1('service, center')).toBe('"service, center"')
        expect(escapeCsvCellV1('رقم "أ"')).toBe('"رقم ""أ"""')
        expect(escapeCsvCellV1('سطر أول\nسطر ثان')).toBe('"سطر أول\nسطر ثان"')
    })

    it('uses Arabic UTF-8 BOM, required columns, and a blank cell for unknown cost', () => {
        const csv = maintenanceRecordsToCsvV1([{
            taskName: 'تغيير الزيت', date: '2025-06-01', odometerReading: 25000,
            cost: null, serviceCenter: 'مركز الصيانة', invoiceNumber: 'INV-1', notes: 'ملاحظة'
        }])

        expect(csv.startsWith('\ufeffنوع الصيانة,التاريخ,العداد,التكلفة,مركز الصيانة,رقم الفاتورة,ملاحظات\r\n')).toBe(true)
        expect(csv).toContain('تغيير الزيت,01/06/2025,25000,,مركز الصيانة,INV-1,ملاحظة')
    })

    it('preserves an explicit zero cost and quotes multiline user text', () => {
        const csv = maintenanceRecordsToCsvV1([{
            taskName: 'صيانة, ضمان', date: '2025-06-01', odometerReading: 0,
            cost: 0, serviceCenter: '', invoiceNumber: '"A"', notes: 'سطر أول\nسطر ثان'
        }])

        expect(csv).toContain('"صيانة, ضمان",01/06/2025,0,0,,"""A""","سطر أول\nسطر ثان"')
    })

    it('leaves invalid dates blank and never turns invalid costs into zero', () => {
        const csv = maintenanceRecordsToCsvV1([{
            taskName: 'صيانة', date: 'invalid', odometerReading: 100,
            cost: 'not-a-number', serviceCenter: '', invoiceNumber: '', notes: ''
        }])

        expect(csv).toContain('صيانة,,100,,,,')
    })
})
