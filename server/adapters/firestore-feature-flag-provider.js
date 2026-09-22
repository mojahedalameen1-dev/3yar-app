import { createSafeFeatureFlagConfig } from '../../shared/contracts/feature-flags.js'
import { adminDb } from '../../api/_firebase-admin.js'
import { resolveFeatureFlagSource } from '../config/runtime-config.js'

function serviceAccountMatchesExpectedProject(env) {
  if (env.FIRESTORE_EMULATOR_HOST) return true
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON || !env.FIREBASE_PROJECT_ID) return false

  try {
    const credentials = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)
    return credentials.project_id === env.FIREBASE_PROJECT_ID
  } catch {
    return false
  }
}

export function createFirestoreFeatureFlagProvider({ env = process.env, getDatabase = adminDb } = {}) {
  return {
    async getConfig() {
      const source = resolveFeatureFlagSource(env)
      if (!source.allowed || !serviceAccountMatchesExpectedProject(env)) {
        return createSafeFeatureFlagConfig()
      }

      const snapshot = await getDatabase().collection('app_config').doc('feature_flags').get()
      return snapshot.exists ? snapshot.data() : createSafeFeatureFlagConfig()
    }
  }
}
