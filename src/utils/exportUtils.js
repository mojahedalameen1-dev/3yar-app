/**
 * Export Utilities for Iyar (عيار) App
 * Excel export functionality with Arabic RTL support
 * Uses dynamic imports to prevent initial load performance issues
 */

import dayjs from 'dayjs'
import 'dayjs/locale/ar'

/**
 * Format number with Arabic locale
 */
function formatNumber(num) {
    return Number(num || 0).toLocaleString('ar-SA')
}

/**
 * Format date in Arabic
 */
function formatDate(date) {
    if (!date) return '-'
    return dayjs(date).locale('ar').format('DD MMMM YYYY')
}

/**
 * Export data to Excel (.xlsx)
 * Dynamically imports xlsx library only when needed
 */
export async function exportToExcel(carData, tasks, records, documents) {
    try {
        // Dynamic import to prevent page blocking
        const XLSX = await import('xlsx')

        const workbook = XLSX.utils.book_new()

        // Sheet 1: Summary (ملخص)
        const summaryData = [
            ['تقرير صيانة السيارة - عيار'],
            [''],
            ['بيانات السيارة'],
            ['الماركة', carData.make || '-'],
            ['الموديل', carData.model || '-'],
            ['سنة الصنع', carData.year || '-'],
            ['رقم اللوحة', carData.plateNumber || '-'],
            ['اللون', carData.color || '-'],
            ['رقم الشاسيه', carData.vin || '-'],
            ['قراءة العداد الحالية', formatNumber(carData.currentOdometer) + ' كم'],
            [''],
            ['إحصائيات'],
            ['إجمالي المهام', tasks?.length || 0],
            ['سجلات الصيانة', records?.length || 0],
            ['الوثائق المسجلة', documents?.length || 0],
            ['إجمالي المصاريف', formatNumber(records?.reduce((sum, r) => sum + (r.cost || 0), 0)) + ' ريال'],
            [''],
            ['تاريخ التقرير', formatDate(new Date())]
        ]

        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
        summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }]
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'ملخص')

        // Sheet 2: Maintenance History (سجل الصيانة)
        const recordsHeader = ['المهمة', 'التاريخ', 'قراءة العداد', 'التكلفة', 'مركز الخدمة', 'ملاحظات']
        const recordsRows = (records || []).map(r => [
            r.taskName || '-',
            formatDate(r.date),
            formatNumber(r.odometerReading) + ' كم',
            formatNumber(r.cost) + ' ريال',
            r.serviceCenter || '-',
            r.notes || '-'
        ])

        const recordsData = [recordsHeader, ...recordsRows]
        const recordsSheet = XLSX.utils.aoa_to_sheet(recordsData)
        recordsSheet['!cols'] = [
            { wch: 20 }, { wch: 18 }, { wch: 15 },
            { wch: 12 }, { wch: 20 }, { wch: 25 }
        ]
        XLSX.utils.book_append_sheet(workbook, recordsSheet, 'سجل الصيانة')

        // Sheet 3: Expenses Analysis (تحليل المصاريف)
        const monthlyExpenses = {}
            ; (records || []).forEach(r => {
                const month = dayjs(r.date).format('YYYY-MM')
                monthlyExpenses[month] = (monthlyExpenses[month] || 0) + (r.cost || 0)
            })

        const expensesHeader = ['الشهر', 'المصاريف']
        const expensesRows = Object.entries(monthlyExpenses)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([month, cost]) => [
                dayjs(month + '-01').locale('ar').format('MMMM YYYY'),
                formatNumber(cost) + ' ريال'
            ])

        const expensesData = [expensesHeader, ...expensesRows]
        const expensesSheet = XLSX.utils.aoa_to_sheet(expensesData)
        expensesSheet['!cols'] = [{ wch: 20 }, { wch: 15 }]
        XLSX.utils.book_append_sheet(workbook, expensesSheet, 'تحليل المصاريف')

        // Generate filename and download
        const fileName = `عيار_تقرير_${carData.make}_${carData.model}_${dayjs().format('YYYY-MM-DD')}.xlsx`
        XLSX.writeFile(workbook, fileName)

        return fileName
    } catch (error) {
        console.error('Excel Export Error:', error)
        throw new Error('فشل تصدير ملف Excel: ' + error.message)
    }
}
