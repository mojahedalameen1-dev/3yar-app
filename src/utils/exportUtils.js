/**
 * Export Utilities for Iyar (عيار) App
 * Excel and PDF export functionality with Arabic RTL support
 */

import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'

// Tajawal font in Base64 (subset for smaller size)
// This is a minimal subset - you may need to include full font for complete Arabic support
const TAJAWAL_FONT_BASE64 = 'AAEAAAASAQAABAAgR0RFRgBKAAgAAAHsAAAAKEdQT1NL8X4IAAACFAAAAGZHU1VC2FPEtQAAAn'

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
 */
export async function exportToExcel(carData, tasks, records, documents) {
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
}

/**
 * Export data to PDF with professional Arabic design
 */
export async function exportToPDF(carData, tasks, records, odometerReadings) {
    // Create PDF in A4 size
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPos = margin

    // Colors
    const primaryColor = [13, 60, 97] // Navy #0D3C61
    const accentColor = [218, 165, 32] // Gold
    const textColor = [30, 30, 30]
    const lightGray = [240, 240, 240]

    // Header background
    doc.setFillColor(...primaryColor)
    doc.rect(0, 0, pageWidth, 45, 'F')

    // Logo placeholder (circle)
    doc.setFillColor(255, 255, 255)
    doc.circle(pageWidth - 25, 22, 12, 'F')
    doc.setFillColor(...primaryColor)
    doc.setFontSize(14)
    doc.setTextColor(...primaryColor)
    doc.text('عيار', pageWidth - 25, 25, { align: 'center' })

    // Title
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.text('تقرير حالة السيارة', pageWidth - margin, 18, { align: 'right' })

    doc.setFontSize(11)
    doc.text(`تاريخ التقرير: ${formatDate(new Date())}`, pageWidth - margin, 30, { align: 'right' })

    // Car info
    doc.setFontSize(12)
    doc.text(`${carData.make || ''} ${carData.model || ''} ${carData.year || ''}`, pageWidth - margin, 38, { align: 'right' })

    yPos = 55

    // Car Details Section
    doc.setFillColor(...lightGray)
    doc.roundedRect(margin, yPos, pageWidth - margin * 2, 40, 3, 3, 'F')

    doc.setTextColor(...primaryColor)
    doc.setFontSize(14)
    doc.text('بيانات السيارة', pageWidth - margin - 5, yPos + 10, { align: 'right' })

    doc.setTextColor(...textColor)
    doc.setFontSize(10)

    const carDetails = [
        [`رقم اللوحة: ${carData.plateNumber || '-'}`, `الماركة: ${carData.make || '-'}`],
        [`قراءة العداد: ${formatNumber(carData.currentOdometer)} كم`, `الموديل: ${carData.model || '-'}`],
        [`اللون: ${carData.color || '-'}`, `سنة الصنع: ${carData.year || '-'}`]
    ]

    carDetails.forEach((row, i) => {
        doc.text(row[0], pageWidth - margin - 5, yPos + 20 + i * 7, { align: 'right' })
        doc.text(row[1], pageWidth / 2 - 5, yPos + 20 + i * 7, { align: 'right' })
    })

    yPos += 50

    // Statistics Section
    const totalCost = (records || []).reduce((sum, r) => sum + (r.cost || 0), 0)
    const urgentTasks = (tasks || []).filter(t =>
        t.statusInfo && (t.statusInfo.status === 'late' || t.statusInfo.status === 'due')
    ).length

    doc.setFillColor(...primaryColor)
    doc.roundedRect(margin, yPos, (pageWidth - margin * 2) / 3 - 5, 25, 3, 3, 'F')
    doc.roundedRect(margin + (pageWidth - margin * 2) / 3, yPos, (pageWidth - margin * 2) / 3 - 5, 25, 3, 3, 'F')
    doc.roundedRect(margin + 2 * (pageWidth - margin * 2) / 3, yPos, (pageWidth - margin * 2) / 3, 25, 3, 3, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)

    // Stats boxes
    doc.text('إجمالي المصاريف', margin + (pageWidth - margin * 2) / 6 - 2.5, yPos + 8, { align: 'center' })
    doc.setFontSize(12)
    doc.text(`${formatNumber(totalCost)} ريال`, margin + (pageWidth - margin * 2) / 6 - 2.5, yPos + 18, { align: 'center' })

    doc.setFontSize(9)
    doc.text('سجلات الصيانة', margin + (pageWidth - margin * 2) / 2 - 2.5, yPos + 8, { align: 'center' })
    doc.setFontSize(12)
    doc.text(`${records?.length || 0}`, margin + (pageWidth - margin * 2) / 2 - 2.5, yPos + 18, { align: 'center' })

    doc.setFontSize(9)
    doc.text('مهام عاجلة', margin + 5 * (pageWidth - margin * 2) / 6, yPos + 8, { align: 'center' })
    doc.setFontSize(12)
    doc.text(`${urgentTasks}`, margin + 5 * (pageWidth - margin * 2) / 6, yPos + 18, { align: 'center' })

    yPos += 35

    // Maintenance Records Table
    if (records && records.length > 0) {
        doc.setTextColor(...primaryColor)
        doc.setFontSize(14)
        doc.text('سجل الصيانة الأخيرة', pageWidth - margin, yPos, { align: 'right' })
        yPos += 8

        const tableData = records.slice(0, 8).map(r => [
            formatNumber(r.cost) + ' ريال',
            formatNumber(r.odometerReading) + ' كم',
            formatDate(r.date),
            r.taskName || '-'
        ])

        doc.autoTable({
            startY: yPos,
            head: [['التكلفة', 'العداد', 'التاريخ', 'المهمة']],
            body: tableData,
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontSize: 10,
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 9,
                halign: 'center',
                textColor: textColor
            },
            alternateRowStyles: {
                fillColor: [248, 248, 248]
            },
            margin: { left: margin, right: margin },
            tableWidth: 'auto'
        })

        yPos = doc.lastAutoTable.finalY + 10
    }

    // Upcoming Tasks Section
    const upcomingTasks = (tasks || []).filter(t =>
        t.statusInfo && ['late', 'due', 'soon'].includes(t.statusInfo.status)
    ).slice(0, 5)

    if (upcomingTasks.length > 0 && yPos < pageHeight - 60) {
        doc.setTextColor(...primaryColor)
        doc.setFontSize(14)
        doc.text('المهام القادمة', pageWidth - margin, yPos, { align: 'right' })
        yPos += 8

        const taskTableData = upcomingTasks.map(t => {
            const statusMap = { late: 'متأخر', due: 'مستحق', soon: 'قريباً', good: 'جيد' }
            return [
                statusMap[t.statusInfo?.status] || '-',
                t.statusInfo?.kmRemaining ? formatNumber(t.statusInfo.kmRemaining) + ' كم' : '-',
                t.name || '-'
            ]
        })

        doc.autoTable({
            startY: yPos,
            head: [['الحالة', 'المتبقي', 'المهمة']],
            body: taskTableData,
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontSize: 10,
                halign: 'center'
            },
            bodyStyles: {
                fontSize: 9,
                halign: 'center',
                textColor: textColor
            },
            margin: { left: margin, right: margin }
        })
    }

    // Footer
    doc.setFillColor(...primaryColor)
    doc.rect(0, pageHeight - 12, pageWidth, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text('عيار - نظام ذكي لإدارة صيانة السيارات', pageWidth / 2, pageHeight - 5, { align: 'center' })

    // Save PDF
    const fileName = `عيار_تقرير_${carData.make}_${carData.model}_${dayjs().format('YYYY-MM-DD')}.pdf`
    doc.save(fileName)

    return fileName
}
