import { randomBytes, timingSafeEqual } from 'node:crypto'
import { adminApp, adminAuth } from './_firebase-admin.js'

const STAGING_PROJECT_ID = 'yar-3yar-staging-2026'
const QA_EMAIL = 'odometer-forecast-v1-20260926@example.com'
const QA_MARKER = '3yar-odometer-forecast-qa-20260926'

function safeEqual(left, right) {
    if (typeof left !== 'string' || typeof right !== 'string') return false
    const leftBuffer = Buffer.from(left)
    const rightBuffer = Buffer.from(right)
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function requirePreviewSecret(request) {
    const expected = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
    const supplied = request.headers['x-vercel-protection-bypass']
    return Boolean(expected && safeEqual(supplied, expected))
}

function verifyStagingRuntime() {
    if (process.env.VERCEL_ENV !== 'preview' || process.env.FIREBASE_PROJECT_ID !== STAGING_PROJECT_ID) {
        return null
    }

    let serviceAccount
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '')
    } catch {
        return null
    }

    if (serviceAccount.project_id !== STAGING_PROJECT_ID) return null

    let app
    try {
        app = adminApp()
    } catch {
        return null
    }

    if (app.options.projectId !== STAGING_PROJECT_ID) return null
    return { app, clientEmail: serviceAccount.client_email }
}

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store, max-age=0')
    response.setHeader('Pragma', 'no-cache')

    if (!requirePreviewSecret(request)) return response.status(404).end()
    const runtime = verifyStagingRuntime()
    if (!runtime) return response.status(403).json({ error: 'Staging-only endpoint' })

    if (request.method === 'GET') {
        return response.status(200).json({
            projectId: STAGING_PROJECT_ID,
            clientEmail: runtime.clientEmail
        })
    }

    if (request.method !== 'POST') {
        response.setHeader('Allow', 'GET, POST')
        return response.status(405).end()
    }

    const auth = adminAuth()
    if (request.body?.action === 'create') {
        try {
            await auth.getUserByEmail(QA_EMAIL)
            return response.status(409).json({ error: 'QA account already exists; refusing to disclose credentials' })
        } catch (error) {
            if (error.code !== 'auth/user-not-found') return response.status(500).json({ error: 'QA account check failed' })
        }

        const password = randomBytes(32).toString('base64url')
        try {
            const user = await auth.createUser({
                email: QA_EMAIL,
                password,
                emailVerified: true,
                disabled: false,
                displayName: QA_MARKER
            })
            return response.status(201).json({
                projectId: STAGING_PROJECT_ID,
                uid: user.uid,
                email: QA_EMAIL,
                password
            })
        } catch {
            return response.status(500).json({ error: 'QA account creation failed' })
        }
    }

    if (request.body?.action === 'delete') {
        try {
            const user = await auth.getUserByEmail(QA_EMAIL)
            if (user.displayName !== QA_MARKER) return response.status(409).json({ error: 'Account marker mismatch; refusing deletion' })
            await auth.deleteUser(user.uid)
            return response.status(200).json({ deleted: true, projectId: STAGING_PROJECT_ID })
        } catch (error) {
            if (error.code === 'auth/user-not-found') return response.status(200).json({ deleted: true, alreadyAbsent: true })
            return response.status(500).json({ error: 'QA account cleanup failed' })
        }
    }

    return response.status(400).json({ error: 'Unsupported action' })
}
