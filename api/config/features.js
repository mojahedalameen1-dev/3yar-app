import { evaluateFeatureFlags, SAFE_FEATURE_FLAGS } from '../../shared/contracts/feature-flags.js'
import { createFirestoreFeatureFlagProvider } from '../../server/adapters/firestore-feature-flag-provider.js'
import { requireUser, sendError } from '../_firebase-admin.js'

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0')
  response.setHeader('Vary', 'Authorization')

  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'Method not allowed' })
  }

  let user
  try {
    user = await requireUser(request)
  } catch (error) {
    return sendError(response, error)
  }

  try {
    const config = await createFirestoreFeatureFlagProvider().getConfig()
    return response.status(200).json({ flags: evaluateFeatureFlags(config, user.uid), degraded: false })
  } catch {
    console.warn('Feature flag configuration is unavailable; safe defaults are active.')
    return response.status(200).json({ flags: SAFE_FEATURE_FLAGS, degraded: true })
  }
}
