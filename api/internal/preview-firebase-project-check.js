import { adminApp } from '../_firebase-admin.js'

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store')
    if (request.method !== 'GET') return response.status(405).end()
    if (process.env.VERCEL_ENV !== 'preview') return response.status(404).end()

    try {
        const app = adminApp()
        return response.status(200).json({
            environment: process.env.VERCEL_ENV,
            firebaseProjectId: app.options.projectId || null
        })
    } catch {
        return response.status(503).json({ error: 'Preview Firebase project check unavailable' })
    }
}
