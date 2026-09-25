import { adminApp, adminAuth } from '../_firebase-admin.js'

const EXPECTED_PROJECT_ID = 'yar-3yar-staging-2026'
const EXPECTED_RUNTIME_IDENTITY = 'yar3yar-staging-runtime@yar-3yar-staging-2026.iam.gserviceaccount.com'
const TEST_EMAIL_PATTERN = /^product-core-smoke-[a-f0-9]{12}@3yar\.test$/i

function testEmail(value) {
    return typeof value === 'string' && TEST_EMAIL_PATTERN.test(value)
}

export default async function handler(request, response) {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')

    if (request.method !== 'POST') return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
    if (process.env.VERCEL_ENV !== 'preview' || process.env.FIREBASE_PROJECT_ID !== EXPECTED_PROJECT_ID) {
        return response.status(403).json({ error: 'PREVIEW_STAGING_ONLY' })
    }

    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}')
        const app = adminApp()
        if (serviceAccount.project_id !== EXPECTED_PROJECT_ID || serviceAccount.client_email !== EXPECTED_RUNTIME_IDENTITY || app.options.projectId !== EXPECTED_PROJECT_ID) {
            return response.status(403).json({ error: 'STAGING_IDENTITY_MISMATCH' })
        }

        const body = typeof request.body === 'string' ? JSON.parse(request.body) : (request.body || {})
        if (!testEmail(body.email)) return response.status(400).json({ error: 'INVALID_TEST_ACCOUNT' })

        const auth = adminAuth()
        if (body.operation === 'create') {
            if (typeof body.password !== 'string' || body.password.length < 24) {
                return response.status(400).json({ error: 'INVALID_TEST_CREDENTIAL' })
            }
            const user = await auth.createUser({
                email: body.email,
                password: body.password,
                emailVerified: true,
                disabled: false
            })
            return response.status(201).json({ ok: true, created: true, verified: user.emailVerified, disabled: user.disabled })
        }

        if (body.operation === 'delete') {
            try {
                const user = await auth.getUserByEmail(body.email)
                await auth.deleteUser(user.uid)
            } catch (error) {
                if (error.code !== 'auth/user-not-found') throw error
            }
            return response.status(200).json({ ok: true, deleted: true })
        }

        return response.status(400).json({ error: 'UNSUPPORTED_OPERATION' })
    } catch (error) {
        const code = typeof error?.code === 'string' && /^[a-z0-9/_-]{1,80}$/i.test(error.code)
            ? error.code
            : 'STAGING_TEST_OPERATION_FAILED'
        return response.status(500).json({ error: code })
    }
}
