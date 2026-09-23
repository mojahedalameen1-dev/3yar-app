import { adminApp } from './_firebase-admin.js'

const EXPECTED_STAGING_PROJECT_ID = 'yar-3yar-staging-2026'

export default function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store, max-age=0')

    if (process.env.VERCEL_ENV !== 'preview') return response.status(404).end()
    if (request.method !== 'GET') return response.status(405).end()

    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}')
        const firebaseProjectId = adminApp().options.projectId
        const isStaging = process.env.FIREBASE_ENVIRONMENT === 'staging'
            && firebaseProjectId === EXPECTED_STAGING_PROJECT_ID
            && serviceAccount.project_id === EXPECTED_STAGING_PROJECT_ID

        if (!isStaging) return response.status(503).json({ error: 'Preview Firebase isolation check failed' })

        return response.status(200).json({
            firebaseProjectId,
            environment: 'preview'
        })
    } catch {
        return response.status(503).json({ error: 'Preview Firebase diagnostic unavailable' })
    }
}
