import { put } from '@vercel/blob'
import { randomUUID } from 'node:crypto'
import { adminDb, requireUser } from './_firebase-admin.js'
import { canUploadForCar } from './_blob-access.js'
import { getV1BlobLimits, readBoundedRequestBody, sanitizeBlobFilename, validateV1BlobUpload } from './_blob-validation.js'

export const config = { api: { bodyParser: false } }

function sendSafeError(response, error) {
    const status = Number.isInteger(error?.status) ? error.status : 500
    if (status >= 500) console.error('Blob upload failed:', error?.name || 'Error')
    return response.status(status).json({ error: status === 401 ? 'Authentication required' : status === 403 ? 'Forbidden' : 'Upload failed' })
}

export default async function handler(request, response) {
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
    try {
        const user = await requireUser(request)
        const ownerId = String(request.query.ownerId || '')
        const carId = String(request.query.carId || '')
        if (!ownerId || !carId) return response.status(400).json({ error: 'Car ownership context is required' })
        const carSnapshot = await adminDb().collection('cars').doc(carId).get()
        if (!carSnapshot.exists || !canUploadForCar(user, ownerId, carSnapshot.data())) {
            return response.status(403).json({ error: 'You cannot upload a file for this car' })
        }

        const contentType = String(request.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase()
        const limits = getV1BlobLimits()
        const maximumBytes = contentType === 'application/pdf' ? limits.pdfBytes : limits.imageBytes
        const declaredLength = Number(request.headers['content-length'] || 0)
        if (declaredLength > maximumBytes) return response.status(413).json({ error: 'File exceeds configured size limit' })

        const bytes = await readBoundedRequestBody(request, maximumBytes)
        const validationError = validateV1BlobUpload({ bytes, contentType, limits })
        if (validationError) return response.status(validationError.status).json({ error: validationError.message })

        const safeName = sanitizeBlobFilename(request.query.pathname, contentType)
        const pathname = `users/${ownerId}/documents/${randomUUID()}-${safeName}`
        const blob = await put(pathname, bytes, { access: 'private', addRandomSuffix: false, contentType })
        return response.status(201).json({ pathname: blob.pathname })
    } catch (error) {
        return sendSafeError(response, error)
    }
}
