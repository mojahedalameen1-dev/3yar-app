import { V1_UPLOAD_LIMITS } from '@/config/upload-limits'

const SIGNATURES = {
    'image/jpeg': bytes => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
    'image/png': bytes => bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value),
    'image/webp': bytes => bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP',
    'application/pdf': bytes => bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === '%PDF-'
}

export async function validateDataUrlFile(file, { allowPdf = false } = {}) {
    if (!file || typeof file.slice !== 'function') return 'تعذر قراءة الملف المحدد.'
    const allowed = allowPdf ? ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] : ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) return 'نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP فقط.'
    if (file.size > V1_UPLOAD_LIMITS.imageBytes) return `حجم الملف يتجاوز الحد المسموح (${Math.floor(V1_UPLOAD_LIMITS.imageBytes / 1024)} كيلوبايت).`
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
    if (!SIGNATURES[file.type]?.(bytes)) return 'محتوى الملف لا يطابق نوعه المعلن.'
    return null
}

export function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('تعذرت قراءة الملف. أعد المحاولة.'))
        reader.onload = () => typeof reader.result === 'string'
            ? resolve(reader.result)
            : reject(new Error('تعذرت قراءة الملف. أعد المحاولة.'))
        reader.readAsDataURL(file)
    })
}
