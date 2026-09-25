import { describe, expect, it, vi } from 'vitest'
import { V1_UPLOAD_LIMITS } from '../../src/config/upload-limits.js'
import { validateDataUrlFile } from '../../src/lib/data-url-upload.js'

function file(type, bytes, size = bytes.length) {
    const content = Uint8Array.from(bytes).buffer
    return { type, size, slice: vi.fn(() => ({ arrayBuffer: async () => content })) }
}

describe('bounded Data URL uploads', () => {
    it('checks actual signatures and allows supported images', async () => {
        await expect(validateDataUrlFile(file('image/jpeg', [0xff, 0xd8, 0xff, 0x00]))).resolves.toBe(null)
        await expect(validateDataUrlFile(file('image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).resolves.toBe(null)
        await expect(validateDataUrlFile(file('image/webp', [...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')]))).resolves.toBe(null)
        await expect(validateDataUrlFile(file('image/png', [0xff, 0xd8, 0xff]))).resolves.toContain('لا يطابق')
    })

    it('rejects oversized and unsupported files before reading bytes', async () => {
        const large = file('image/jpeg', [0xff, 0xd8, 0xff], V1_UPLOAD_LIMITS.imageBytes + 1)
        expect(await validateDataUrlFile(large)).toContain('حجم الملف')
        expect(large.slice).not.toHaveBeenCalled()
        await expect(validateDataUrlFile(file('image/svg+xml', [0x3c, 0x73, 0x76, 0x67]))).resolves.toContain('نوع الملف')
    })

    it('accepts PDF only for document fields and validates the PDF signature', async () => {
        await expect(validateDataUrlFile(file('application/pdf', [...Buffer.from('%PDF-1.7')]), { allowPdf: true })).resolves.toBe(null)
        await expect(validateDataUrlFile(file('application/pdf', [0x00, 0x01]), { allowPdf: true })).resolves.toContain('لا يطابق')
        await expect(validateDataUrlFile(file('application/pdf', [...Buffer.from('%PDF-1.7')]))).resolves.toContain('نوع الملف')
    })
})
