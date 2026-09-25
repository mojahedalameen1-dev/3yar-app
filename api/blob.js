import { get } from '@vercel/blob'
import { adminDb, requireUser } from './_firebase-admin.js'
import { canReadBlobDocument } from './_blob-access.js'
import { validLegacySignature, validSignature } from './_blob-signature.js'

const REFERENCE_COLLECTIONS = Object.freeze({
    documents: 'image',
    maintenance_records: 'invoice_image',
    cars: 'image'
})

function validPath(pathname) {
    return pathname.startsWith('users/') && !pathname.split('/').some(segment => !segment || segment === '.' || segment === '..')
}

function sendSafeError(response, error) {
    const status = Number.isInteger(error?.status) ? error.status : 500
    if (status >= 500) console.error('Blob read failed:', error?.name || 'Error')
    return response.status(status).end(status === 403 ? 'Forbidden' : status === 404 ? 'Not found' : 'Request failed')
}

export default async function handler(request, response) {
    if (request.method !== 'GET') return response.status(405).end('Method not allowed')
    const pathname = String(request.query.pathname || '')
    const signature = String(request.query.sig || '')
    if (!validPath(pathname)) return response.status(400).end('Invalid path')

    try {
        const user = await requireUser(request)
        if (signature) {
            const expiresAt = request.query.exp
            const valid = expiresAt
                ? validSignature(pathname, signature, Number(expiresAt))
                : validLegacySignature(pathname, signature)
            if (!valid) return response.status(403).end('Forbidden')
        }

        const collectionName = String(request.query.collection || 'documents')
        const fieldName = REFERENCE_COLLECTIONS[collectionName]
        const documentId = String(request.query.documentId || '')
        if (!fieldName || !documentId) return response.status(400).end('Document reference required')
        const snapshot = await adminDb().collection(collectionName).doc(documentId).get()
        if (!snapshot.exists || !canReadBlobDocument(user, snapshot.data(), pathname, fieldName)) {
            return response.status(403).end('Forbidden')
        }

        const result = await get(pathname, { access: 'private' })
        if (!result || result.statusCode !== 200) return response.status(404).end('Not found')
        response.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream')
        response.setHeader('Cache-Control', 'private, no-store')
        response.setHeader('X-Content-Type-Options', 'nosniff')
        const reader = result.stream.getReader()
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            response.write(Buffer.from(value))
        }
        return response.end()
    } catch (error) {
        return sendSafeError(response, error)
    }
}
