import { HttpError } from '../http/http-error.js'

const MIME_SIGNATURES = [
  { mimeType: 'image/jpeg', prefix: [0xff, 0xd8, 0xff] },
  { mimeType: 'image/png', prefix: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mimeType: 'image/gif', prefix: [0x47, 0x49, 0x46, 0x38] },
  { mimeType: 'image/webp', prefix: [0x52, 0x49, 0x46, 0x46], suffixOffset: 8, suffix: [0x57, 0x45, 0x42, 0x50] },
  { mimeType: 'application/pdf', prefix: [0x25, 0x50, 0x44, 0x46, 0x2d] }
]

export function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return 'attachment'
  const normalized = filename.normalize('NFKC').split(/[\\/]/).pop() || ''
  const safe = Array.from(normalized)
    .filter(character => {
      const codePoint = character.codePointAt(0)
      return codePoint < 0x20 || codePoint === 0x7f ? false : true
    })
    .join('')
    .replace(/[^\p{L}\p{N}._ -]/gu, '_')
    .replace(/\.{2,}/g, '.')
    .trim()
    .slice(0, 120)
  return safe && safe !== '.' ? safe : 'attachment'
}

export function detectContentType(bytes) {
  const data = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes || [])
  const signature = MIME_SIGNATURES.find(candidate => {
    const prefixMatches = candidate.prefix.every((byte, index) => data[index] === byte)
    const suffixMatches = !candidate.suffix || candidate.suffix.every((byte, index) => data[candidate.suffixOffset + index] === byte)
    return prefixMatches && suffixMatches
  })
  return signature?.mimeType || null
}

export function validateDeclaredFile({ contentType, size, storageConfig }) {
  if (!Number.isSafeInteger(size) || size < 1) throw new HttpError(400, 'File size is invalid', 'invalid_file_size')
  const isImage = contentType === 'image/jpeg'
    || contentType === 'image/png'
    || contentType === 'image/webp'
    || contentType === 'image/gif'
  const maximum = isImage ? storageConfig.maxImageBytes : contentType === 'application/pdf' ? storageConfig.maxPdfBytes : null
  if (!maximum) throw new HttpError(415, 'Only supported image files and PDF documents are accepted', 'unsupported_file_type')
  if (size > maximum) throw new HttpError(413, 'File exceeds the configured size limit', 'file_too_large')
  return { category: isImage ? 'image' : 'pdf', maximum }
}

export function assertStorageLimitsConfigured(storageConfig) {
  const required = ['maxImageBytes', 'maxPdfBytes', 'maxAttachmentsPerRecord', 'perUserQuotaBytes', 'globalQuotaBytes', 'globalWarningPercent']
  if (required.some(key => !Number.isSafeInteger(storageConfig?.[key]) || storageConfig[key] < 1)) {
    throw new HttpError(503, 'Private attachments are not configured', 'attachment_storage_unavailable')
  }
}
