import { adminDb } from '../../api/_firebase-admin.js'
import { createFirestoreFeatureFlagProvider } from '../adapters/firestore-feature-flag-provider.js'
import { createVercelPrivateBlobProvider } from '../adapters/vercel-private-blob-provider.js'
import { resolvePreviewFirebaseIsolation, readRuntimeConfig } from '../config/runtime-config.js'
import { createFirestoreIdempotency } from '../domain/idempotency.js'
import { evaluateFeatureFlag } from '../../shared/contracts/feature-flags.js'
import { createAttachmentLifecycle } from './attachment-lifecycle.js'
import { createOrphanCleanup } from './orphan-cleanup.js'
import { createCascadeDeletion } from '../domain/cascade-deletion.js'
import { HttpError } from '../http/http-error.js'

export function createDefaultV2Services({ env = process.env, db = adminDb() } = {}) {
  const runtime = readRuntimeConfig(env)
  const idempotency = createFirestoreIdempotency({ db })
  const storageProvider = createVercelPrivateBlobProvider({ env })
  const flagProvider = createFirestoreFeatureFlagProvider({ env, getDatabase: () => db })
  const featureFlags = {
    async isEnabled(flagKey, userId) {
      try {
        return evaluateFeatureFlag(await flagProvider.getConfig(), flagKey, userId)
      } catch {
        return false
      }
    }
  }
  const stagingFirebaseIsolated = () => env.VERCEL_ENV === 'preview'
    && env.FIREBASE_ENVIRONMENT === 'staging'
    && resolvePreviewFirebaseIsolation(env).allowed
  const assertStagingBlobAndFirebaseIsolation = () => {
    if (!stagingFirebaseIsolated()) {
      throw new HttpError(503, 'V2 operations are limited to isolated Staging', 'staging_environment_not_isolated')
    }
    return storageProvider.verifyIsolation()
  }

  return {
    runtime,
    idempotency,
    storageProvider,
    attachmentLifecycle: createAttachmentLifecycle({
      db,
      idempotency,
      storageProvider,
      storageConfig: {
        ...runtime.storage,
        pendingUploadTtlMs: Number(env.STORAGE_PENDING_UPLOAD_TTL_MS) || null,
        uploadGrantTtlMs: Number(env.STORAGE_UPLOAD_GRANT_TTL_MS) || null
      },
      featureFlags,
      assertStorageIsolation: assertStagingBlobAndFirebaseIsolation,
      readMode: env.V2_ATTACHMENT_READ_MODE === 'authorization-proxy' ? 'authorization-proxy' : 'signed-url'
    }),
    orphanCleanup: {
      runBatch: (...args) => createOrphanCleanup({
        db,
        storageProvider,
        gracePeriodMs: runtime.orphanCleanup.gracePeriodMs,
        batchSize: runtime.orphanCleanup.batchSize,
        globalQuotaBytes: runtime.storage.globalQuotaBytes,
        globalWarningPercent: runtime.storage.globalWarningPercent,
        assertStagingIsolation: assertStagingBlobAndFirebaseIsolation
      }).runBatch(...args)
    },
    cascadeDeletion: createCascadeDeletion({
      db,
      idempotency,
      batchSize: Number(env.CASCADE_DELETE_BATCH_SIZE) || 50,
      assertStagingOnly: stagingFirebaseIsolated
    }),
    assertStagingFirebaseIsolated: stagingFirebaseIsolated
  }
}
