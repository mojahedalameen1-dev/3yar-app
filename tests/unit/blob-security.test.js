import { afterEach, describe, expect, it } from 'vitest'
import { canReadBlobDocument, canUploadForCar } from '../../api/_blob-access.js'
import { detectV1BlobMime, getV1BlobLimits, readBoundedRequestBody, sanitizeBlobFilename, validateV1BlobUpload } from '../../api/_blob-validation.js'
import { signPath, validLegacySignature, validSignature } from '../../api/_blob-signature.js'

const priorToken = process.env.BLOB_READ_WRITE_TOKEN
afterEach(() => {
    if (priorToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN
    else process.env.BLOB_READ_WRITE_TOKEN = priorToken
})

describe('private V1 Blob access and validation', () => {
    it('requires an exact document reference, owner/path match, or admin', () => {
        const record = { user_id: 'owner-1', image: 'users/owner-1/documents/test.jpg' }
        expect(canReadBlobDocument({ uid: 'owner-1' }, record, record.image)).toBe(true)
        expect(canReadBlobDocument({ uid: 'other-1' }, record, record.image)).toBe(false)
        expect(canReadBlobDocument({ uid: 'admin-1', admin: true }, record, record.image)).toBe(true)
        expect(canReadBlobDocument({ uid: 'owner-1' }, record, 'users/owner-1/documents/other.jpg')).toBe(false)
        expect(canReadBlobDocument({ uid: 'owner-1' }, { ...record, user_id: 'other-1' }, record.image)).toBe(false)
    })

    it('keeps legacy signed references behind owner auth and exact document linkage', () => {
        const pathname = 'users/owner-1/documents/legacy.jpg'
        const record = { user_id: 'owner-1', image: `/api/blob?pathname=${encodeURIComponent(pathname)}&sig=legacy-value` }
        expect(canReadBlobDocument({ uid: 'owner-1' }, record, pathname)).toBe(true)
        expect(canReadBlobDocument({ uid: 'other-1' }, record, pathname)).toBe(false)
        expect(canReadBlobDocument({ uid: 'owner-1' }, record, 'users/owner-1/documents/other.jpg')).toBe(false)
    })

    it('limits server uploads to the owner or admin and a non-deleting car of that owner', () => {
        expect(canUploadForCar({ uid: 'admin', admin: true }, 'owner', { user_id: 'owner' })).toBe(true)
        expect(canUploadForCar({ uid: 'owner' }, 'owner', { user_id: 'owner' })).toBe(true)
        expect(canUploadForCar({ uid: 'other' }, 'owner', { user_id: 'owner' })).toBe(false)
        expect(canUploadForCar({ uid: 'admin', admin: true }, 'other', { user_id: 'owner' })).toBe(false)
        expect(canUploadForCar({ uid: 'admin', admin: true }, 'owner', { user_id: 'owner', deletion_requested: true })).toBe(false)
    })

    it('validates allowed MIME, actual signatures, byte limits and sanitized names', () => {
        const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00])
        expect(detectV1BlobMime(jpeg)).toBe('image/jpeg')
        expect(validateV1BlobUpload({ bytes: jpeg, contentType: 'image/jpeg', limits: { imageBytes: 4, pdfBytes: 4 } })).toBe(null)
        expect(validateV1BlobUpload({ bytes: jpeg, contentType: 'image/png', limits: { imageBytes: 4, pdfBytes: 4 } }).status).toBe(415)
        expect(validateV1BlobUpload({ bytes: jpeg, contentType: 'image/jpeg', limits: { imageBytes: 3, pdfBytes: 4 } }).status).toBe(413)
        expect(validateV1BlobUpload({ bytes: Buffer.from('x'), contentType: 'image/svg+xml' }).status).toBe(415)
        expect(sanitizeBlobFilename('../../شهادة السيارة.PDF', 'application/pdf')).toBe('document.pdf')
        expect(sanitizeBlobFilename('invoice.jpg', 'image/jpeg')).toBe('invoice.jpg')
        expect(getV1BlobLimits({ V1_BLOB_MAX_IMAGE_BYTES: '2048', V1_BLOB_MAX_PDF_BYTES: '4096' })).toEqual({ imageBytes: 2048, pdfBytes: 4096 })
    })

    it('rejects streamed bodies as soon as their configured limit is crossed', async () => {
        async function *body() { yield Buffer.from('1234'); yield Buffer.from('5678') }
        await expect(readBoundedRequestBody(body(), 6)).rejects.toMatchObject({ status: 413 })
    })

    it('accepts only expiring new signatures and keeps legacy validation explicit', () => {
        process.env.BLOB_READ_WRITE_TOKEN = 'synthetic-test-key'
        const now = 1_800_000_000
        const path = 'users/owner-1/documents/file.jpg'
        const grant = signPath(path, now + 60)
        expect(validSignature(path, grant.signature, grant.expiresAt, now)).toBe(true)
        expect(validSignature(path, grant.signature, grant.expiresAt, now + 60)).toBe(false)
        expect(validSignature(path, grant.signature, now + 901, now)).toBe(false)
        expect(validLegacySignature(path, grant.signature)).toBe(false)
    })
})
