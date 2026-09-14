import { get } from '@vercel/blob'
import { validSignature } from './_blob-signature.js'

export default async function handler(request, response) {
    if (request.method !== 'GET') return response.status(405).end('Method not allowed')
    const pathname = String(request.query.pathname || '')
    const signature = String(request.query.sig || '')
    if (!validSignature(pathname, signature)) return response.status(403).end('Forbidden')

    const result = await get(pathname, { access: 'private' })
    if (!result || result.statusCode !== 200) return response.status(404).end('Not found')
    response.setHeader('Content-Type', result.blob.contentType || 'application/octet-stream')
    response.setHeader('Cache-Control', 'private, max-age=3600')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    const reader = result.stream.getReader()
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        response.write(Buffer.from(value))
    }
    response.end()
}
