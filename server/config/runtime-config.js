const STORAGE_VARIABLES = Object.freeze({
  maxImageBytes: { name: 'STORAGE_MAX_IMAGE_BYTES', minimum: 1 },
  maxPdfBytes: { name: 'STORAGE_MAX_PDF_BYTES', minimum: 1 },
  maxAttachmentsPerRecord: { name: 'STORAGE_MAX_ATTACHMENTS_PER_RECORD', minimum: 1 },
  perUserQuotaBytes: { name: 'STORAGE_PER_USER_QUOTA_BYTES', minimum: 1 },
  globalQuotaBytes: { name: 'STORAGE_GLOBAL_QUOTA_BYTES', minimum: 1 },
  globalWarningPercent: { name: 'STORAGE_GLOBAL_WARNING_PERCENT', minimum: 1, maximum: 100 }
})

export function resolvePreviewFirebaseIsolation(env = process.env) {
  if (env.VERCEL_ENV !== 'preview') return { required: false, allowed: true }

  const stagingProjectId = env.FIREBASE_STAGING_PROJECT_ID || ''
  const productionProjectId = env.FIREBASE_PRODUCTION_PROJECT_ID || ''
  const browserProjectId = env.VITE_FIREBASE_PROJECT_ID || ''
  const serverProjectId = env.FIREBASE_PROJECT_ID || ''
  let serviceAccountProjectId = ''

  try {
    serviceAccountProjectId = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}').project_id || ''
  } catch {
    // A malformed credential must never be treated as proof of isolation.
  }

  const allowed = env.FIREBASE_ENVIRONMENT === 'staging'
    && Boolean(stagingProjectId)
    && Boolean(productionProjectId)
    && stagingProjectId !== productionProjectId
    && browserProjectId === stagingProjectId
    && serverProjectId === stagingProjectId
    && serviceAccountProjectId === stagingProjectId

  return { required: true, allowed }
}

export function resolvePrivateBlobIsolation(env = process.env) {
  const required = env.VERCEL_ENV === 'preview'
    && env.FIREBASE_ENVIRONMENT === 'staging'
  const privateStoreId = env.V2_PRIVATE_BLOB_STORE_ID || ''
  const productionStoreId = env.BLOB_PRODUCTION_STORE_ID || ''
  const baselineStoreId = productionStoreId
  const allowed = required
    && Boolean(privateStoreId)
    && Boolean(baselineStoreId)
    && privateStoreId !== baselineStoreId
    && Boolean(env.V2_PRIVATE_BLOB_READ_WRITE_TOKEN || env.VERCEL_OIDC_TOKEN)

  return {
    required,
    allowed,
    storeId: allowed ? privateStoreId : '',
    baselineStoreId: baselineStoreId || ''
  }
}

function parseOptionalInteger(env, name, minimum, maximum = Number.MAX_SAFE_INTEGER) {
  const raw = env[name]
  if (raw === undefined || raw === '') return { value: null, error: null }

  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    return { value: null, error: `${name} must be an integer between ${minimum} and ${maximum}` }
  }

  return { value, error: null }
}

export function resolveFeatureFlagSource(env = process.env) {
  const runtime = env.VERCEL_ENV || 'local'
  const firebaseEnvironment = env.FIREBASE_ENVIRONMENT || ''
  const projectId = env.FIREBASE_PROJECT_ID || ''
  const productionProjectId = env.FIREBASE_PRODUCTION_PROJECT_ID || ''
  const stagingProjectId = env.FIREBASE_STAGING_PROJECT_ID || ''

  if (runtime === 'preview') {
    const isolatedStagingProject = firebaseEnvironment === 'staging'
      && Boolean(projectId)
      && projectId === stagingProjectId
      && projectId !== productionProjectId
    return { allowed: isolatedStagingProject, environment: isolatedStagingProject ? 'staging' : 'safe-defaults' }
  }

  if (runtime === 'production') {
    const isExpectedProduction = firebaseEnvironment === 'production'
      && Boolean(projectId)
      && projectId === productionProjectId
    return { allowed: isExpectedProduction, environment: isExpectedProduction ? 'production' : 'safe-defaults' }
  }

  if (firebaseEnvironment === 'emulator') {
    const isDemoEmulator = Boolean(env.FIRESTORE_EMULATOR_HOST) && projectId.startsWith('demo-')
    return { allowed: isDemoEmulator, environment: isDemoEmulator ? 'emulator' : 'safe-defaults' }
  }

  const isExplicitStaging = firebaseEnvironment === 'staging'
    && Boolean(projectId)
    && projectId === stagingProjectId
    && projectId !== productionProjectId
  return { allowed: isExplicitStaging, environment: isExplicitStaging ? 'staging' : 'safe-defaults' }
}

export function readRuntimeConfig(env = process.env) {
  const errors = []
  const storage = {}

  for (const [key, definition] of Object.entries(STORAGE_VARIABLES)) {
    const parsed = parseOptionalInteger(env, definition.name, definition.minimum, definition.maximum)
    storage[key] = parsed.value
    if (parsed.error) errors.push(parsed.error)
  }

  const cleanupGrace = parseOptionalInteger(env, 'ORPHAN_CLEANUP_GRACE_PERIOD_MS', 1)
  const cleanupBatch = parseOptionalInteger(env, 'ORPHAN_CLEANUP_BATCH_SIZE', 1, 450)
  if (cleanupGrace.error) errors.push(cleanupGrace.error)
  if (cleanupBatch.error) errors.push(cleanupBatch.error)

  return {
    storage,
    privateBlob: resolvePrivateBlobIsolation(env),
    orphanCleanup: {
      gracePeriodMs: cleanupGrace.value,
      batchSize: cleanupBatch.value
    },
    featureFlagSource: resolveFeatureFlagSource(env),
    errors
  }
}
