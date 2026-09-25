const MIME_EXTENSIONS = Object.freeze({
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf'
})

function positiveLimit(value, fallback) {
    const parsed = Number(value)
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function getV1BlobLimits(env = process.env) {
    return {
        imageBytes: positiveLimit(env.V1_BLOB_MAX_IMAGE_BYTES, 5 * 1024 * 1024),
        pdfBytes: positiveLimit(env.V1_BLOB_MAX_PDF_BYTES, 5 * 1024 * 1024)
    }
}

export function detectV1BlobMime(bytes) {
    const data = Buffer.from(bytes)
    if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
    if (Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).equals(data.subarray(0, 8))) return 'image/png'
    if (data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
    if (data.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf'
    return null
}

export function validateV1BlobUpload({ bytes, contentType, limits = getV1BlobLimits() }) {
    const normalizedType = String(contentType || '').split(';', 1)[0].trim().toLowerCase()
    const limit = normalizedType === 'application/pdf' ? limits.pdfBytes : limits.imageBytes
    if (!Object.hasOwn(MIME_EXTENSIONS, normalizedType)) {
        return { status: 415, message: 'نوع الملف غير مسموح. استخدم JPEG أو PNG أو WebP أو PDF.' }
    }
    if (!bytes?.length || bytes.length > limit) {
        return { status: 413, message: `حجم الملف غير مسموح. الحد الأقصى ${limit} بايت.` }
    }
    if (detectV1BlobMime(bytes) !== normalizedType) {
        return { status: 415, message: 'محتوى الملف لا يطابق نوعه المعلن.' }
    }
    return null
}

export function sanitizeBlobFilename(filename, contentType) {
    const originalName = String(filename || '').replaceAll('\\', '/').split('/').at(-1) || ''
    const stem = originalName.replace(/\.[^.]*$/, '')
        .normalize('NFKC')
        .replace(/[^A-Za-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64) || 'document'
    const extension = MIME_EXTENSIONS[String(contentType || '').toLowerCase()]
    return extension ? `${stem}.${extension}` : 'document'
}

export async function readBoundedRequestBody(request, maximumBytes) {
    const chunks = []
    let totalBytes = 0
    for await (const chunk of request) {
        const buffer = Buffer.from(chunk)
        totalBytes += buffer.length
        if (totalBytes > maximumBytes) throw Object.assign(new Error(`حجم الملف تجاوز الحد ${maximumBytes} بايت.`), { status: 413 })
        chunks.push(buffer)
    }
    return Buffer.concat(chunks, totalBytes)
}
