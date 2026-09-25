import { adminApp } from '../_firebase-admin.js'

const EXPECTED_PROJECT_ID = 'yar-3yar-staging-2026'

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store')
    if (request.method !== 'GET') return response.status(405).end()
    if (process.env.VERCEL_ENV !== 'preview') return response.status(404).end()

    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}')
        const projectId = serviceAccount.project_id
        const clientEmail = serviceAccount.client_email
        if (projectId !== EXPECTED_PROJECT_ID || adminApp().options.projectId !== EXPECTED_PROJECT_ID || !clientEmail) {
            return response.status(403).json({ error: 'Preview Firebase identity mismatch' })
        }
        return response.status(200).json({
            environment: 'preview',
            projectId,
            clientEmail
        })
    } catch {
        return response.status(503).json({ error: 'Preview Firebase identity unavailable' })
    }
}
