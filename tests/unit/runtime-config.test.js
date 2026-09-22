import { describe, expect, it } from 'vitest'
import { readRuntimeConfig, resolveFeatureFlagSource, resolvePreviewFirebaseIsolation, resolvePrivateBlobIsolation } from '../../server/config/runtime-config.js'
import { createFirestoreFeatureFlagProvider } from '../../server/adapters/firestore-feature-flag-provider.js'

describe('runtime environment isolation', () => {
  it('blocks Preview builds unless browser and Admin credentials point to the distinct Staging project', () => {
    expect(resolvePreviewFirebaseIsolation({
      VERCEL_ENV: 'preview',
      FIREBASE_ENVIRONMENT: 'production',
      FIREBASE_PROJECT_ID: 'yar-3yar-free',
      FIREBASE_PRODUCTION_PROJECT_ID: 'yar-3yar-free',
      VITE_FIREBASE_PROJECT_ID: 'yar-3yar-free',
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'yar-3yar-free' })
    })).toEqual({ required: true, allowed: false })
  })

  it('allows Preview builds only when the browser, server, and Admin credential agree on Staging', () => {
    expect(resolvePreviewFirebaseIsolation({
      VERCEL_ENV: 'preview',
      FIREBASE_ENVIRONMENT: 'staging',
      FIREBASE_PROJECT_ID: 'yar-3yar-staging',
      FIREBASE_STAGING_PROJECT_ID: 'yar-3yar-staging',
      FIREBASE_PRODUCTION_PROJECT_ID: 'yar-3yar-free',
      VITE_FIREBASE_PROJECT_ID: 'yar-3yar-staging',
      FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'yar-3yar-staging' })
    })).toEqual({ required: true, allowed: true })
  })

  it('keeps Vercel Preview on safe defaults without a distinct Firebase staging project', () => {
    expect(resolveFeatureFlagSource({
      VERCEL_ENV: 'preview',
      FIREBASE_ENVIRONMENT: 'production',
      FIREBASE_PROJECT_ID: 'yar-3yar-free',
      FIREBASE_PRODUCTION_PROJECT_ID: 'yar-3yar-free'
    })).toEqual({ allowed: false, environment: 'safe-defaults' })
  })

  it('allows Preview Firebase reads only for the explicitly identified staging project', () => {
    expect(resolveFeatureFlagSource({
      VERCEL_ENV: 'preview',
      FIREBASE_ENVIRONMENT: 'staging',
      FIREBASE_PROJECT_ID: 'yar-3yar-staging',
      FIREBASE_STAGING_PROJECT_ID: 'yar-3yar-staging',
      FIREBASE_PRODUCTION_PROJECT_ID: 'yar-3yar-free'
    })).toEqual({ allowed: true, environment: 'staging' })
  })

  it('rejects a staging project that aliases Production', () => {
    expect(resolveFeatureFlagSource({
      VERCEL_ENV: 'preview',
      FIREBASE_ENVIRONMENT: 'staging',
      FIREBASE_PROJECT_ID: 'yar-3yar-free',
      FIREBASE_STAGING_PROJECT_ID: 'yar-3yar-free',
      FIREBASE_PRODUCTION_PROJECT_ID: 'yar-3yar-free'
    }).allowed).toBe(false)
  })

  it('allows a local demo Emulator only when its endpoint and project are explicit', () => {
    expect(resolveFeatureFlagSource({
      FIREBASE_ENVIRONMENT: 'emulator',
      FIREBASE_PROJECT_ID: 'demo-3yar-rules',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080'
    })).toEqual({ allowed: true, environment: 'emulator' })
    expect(resolveFeatureFlagSource({
      FIREBASE_ENVIRONMENT: 'emulator',
      FIREBASE_PROJECT_ID: 'yar-3yar-free'
    }).allowed).toBe(false)
  })

  it('never reads Firebase Production for a Vercel Preview without a distinct staging project', async () => {
    let databaseReads = 0
    const provider = createFirestoreFeatureFlagProvider({
      env: {
        VERCEL_ENV: 'preview',
        FIREBASE_ENVIRONMENT: 'production',
        FIREBASE_PROJECT_ID: 'yar-3yar-free',
        FIREBASE_PRODUCTION_PROJECT_ID: 'yar-3yar-free',
        FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({ project_id: 'yar-3yar-free' })
      },
      getDatabase: () => {
        databaseReads += 1
        throw new Error('Preview attempted a Firebase read')
      }
    })

    const config = await provider.getConfig()
    expect(databaseReads).toBe(0)
    expect(config.globalEnabled).toBe(false)
  })

  it('parses storage bounds from environment without introducing fixed limits', () => {
    const config = readRuntimeConfig({
      STORAGE_MAX_IMAGE_BYTES: '2000000',
      STORAGE_MAX_PDF_BYTES: '8000000',
      STORAGE_MAX_ATTACHMENTS_PER_RECORD: '6',
      STORAGE_PER_USER_QUOTA_BYTES: '25000000',
      STORAGE_GLOBAL_QUOTA_BYTES: '100000000',
      STORAGE_GLOBAL_WARNING_PERCENT: '80'
    })

    expect(config.storage).toEqual({
      maxImageBytes: 2000000,
      maxPdfBytes: 8000000,
      maxAttachmentsPerRecord: 6,
      perUserQuotaBytes: 25000000,
      globalQuotaBytes: 100000000,
      globalWarningPercent: 80
    })
    expect(config.errors).toEqual([])
  })

  it('reports invalid optional storage configuration without inventing a replacement value', () => {
    const config = readRuntimeConfig({ STORAGE_MAX_IMAGE_BYTES: '-1', STORAGE_GLOBAL_WARNING_PERCENT: '101' })
    expect(config.storage.maxImageBytes).toBeNull()
    expect(config.storage.globalWarningPercent).toBeNull()
    expect(config.errors).toHaveLength(2)
  })

  it('proves private Blob isolation only for a Preview Staging store distinct from the shared baseline', () => {
    expect(resolvePrivateBlobIsolation({
      VERCEL_ENV: 'preview',
      FIREBASE_ENVIRONMENT: 'staging',
      BLOB_PRODUCTION_STORE_ID: 'store-production',
      V2_PRIVATE_BLOB_STORE_ID: 'store-staging',
      V2_PRIVATE_BLOB_READ_WRITE_TOKEN: 'present'
    })).toMatchObject({ required: true, allowed: true, storeId: 'store-staging', baselineStoreId: 'store-production' })

    expect(resolvePrivateBlobIsolation({
      VERCEL_ENV: 'preview',
      FIREBASE_ENVIRONMENT: 'staging',
      BLOB_PRODUCTION_STORE_ID: 'same-store',
      V2_PRIVATE_BLOB_STORE_ID: 'same-store',
      V2_PRIVATE_BLOB_READ_WRITE_TOKEN: 'present'
    }).allowed).toBe(false)
  })
})
