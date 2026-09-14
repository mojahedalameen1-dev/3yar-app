import { put } from '@vercel/blob'
import { requireUser, sendError } from './_firebase-admin.js'
import { signPath } from './_blob-signature.js'

export const config = { api: { bodyParser: false } }

export default async function handler(request, response) {
    if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
    try {
        const user = await requireUser(request)
        const requestedPath = String(request.query.pathname || '').replace(/^\/+/, '')
        if (!requestedPath || requestedPath.includes('..')) return response.status(400).json({ error: 'Invalid pathname' })
        const contentType = request.headers['content-type'] || 'application/octet-stream'
        if (!contentType.startsWith('image/')) return response.status(415).json({ error: 'Only images are allowed' })
        const pathname = `users/${user.uid}/${requestedPath}`
        const blob = await put(pathname, request, { access: 'private', addRandomSuffix: true, contentType })
        const signature = signPath(blob.pathname)
        response.status(200).json({
            pathname: blob.pathname,
            url: `/api/blob?pathname=${encodeURIComponent(blob.pathname)}&sig=${encodeURIComponent(signature)}`
        })
    } catch (error) {
        sendError(response, error)
    }
}
