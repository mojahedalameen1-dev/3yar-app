/**
 * PDF Export Utility for Iyar (عيار) App
 * Uses html2canvas to capture the DOM element for perfect Arabic support
 * Uses dynamic imports to prevent page load crashes
 */

/**
 * Export specific DOM element to PDF
 * @param {HTMLElement} element - The hidden report element
 * @param {Object} carData - Car data for filename
 * @param {Object} extraData - Additional data (unused in this strategy but kept for interface compatibility)
 */
export async function exportToPDF(element, carData, extraData = {}) {
    try {
        // Dynamic imports to ensure potential dependency issues don't crash the app on load
        const [jsPDFModule, html2canvasModule] = await Promise.all([
            import('jspdf'),
            import('html2canvas')
        ])

        const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default
        const html2canvas = html2canvasModule.default

        if (!element) {
            throw new Error('Report element not found')
        }

        // Temporarily make visible for capture if needed, though off-screen usually works
        // html2canvas works best if the element is in the DOM

        const canvas = await html2canvas(element, {
            scale: 2, // High resolution
            useCORS: true, // For images
            logging: false,
            windowWidth: 794, // A4 width in px at 96dpi (approx)
            windowHeight: 1123 // A4 height
        })

        const imgData = canvas.toDataURL('image/png')

        // A4 size: 210mm x 297mm
        const pdf = new jsPDF('p', 'mm', 'a4')
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = pdf.internal.pageSize.getHeight()

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

        const dateStr = new Date().toISOString().split('T')[0]
        const safeMake = carData?.make?.replace(/[^a-z0-9]/gi, '_') || 'Car'
        const safeModel = carData?.model?.replace(/[^a-z0-9]/gi, '_') || ''
        const fileName = `Iyar_Report_${safeMake}_${safeModel}_${dateStr}.pdf`

        pdf.save(fileName)

        return fileName

    } catch (error) {
        console.error('PDF Export Error:', error)
        throw new Error('فشل إنشاء ملف PDF: ' + error.message)
    }
}
