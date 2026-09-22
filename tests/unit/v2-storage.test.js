import { describe, expect, it, vi } from 'vitest'
import { createVercelPrivateBlobProvider } from '../../server/adapters/vercel-private-blob-provider.js'
import { createStorageAccessAdapter } from '../../server/storage/access-adapter.js'
import { sanitizeFilename, detectContentType } from '../../server/attachments/file-validation.js'

const stagingEnv = {
  VERCEL_ENV: 'preview',
  FIREBASE_ENVIRONMENT: 'staging',
  BLOB_PRODUCTION_STORE_ID: 'production-store',
  V2_PRIVATE_BLOB_STORE_ID: 'staging-store',
  V2_PRIVATE_BLOB_READ_WRITE_TOKEN: 'token-is-not-logged'
}

describe('V2 private Blob adapter and storage access', () => {
  it('checks that an issued upload grant belongs to the distinct Staging store before returning a URL', async () => {
    const validUntil = Date.now() + 60_000
    const issueSignedToken = vi.fn(async () => ({ delegationToken: 'delegation', clientSigningToken: 'signer', validUntil }))
    const presignUrl = vi.fn(async () => ({ presignedUrl: 'https://private.test/upload' }))
    const provider = createVercelPrivateBlobProvider({
      env: stagingEnv,
      sdk: { issueSignedToken, presignUrl, parseStoreIdFromDelegationToken: () => 'staging-store' }
    })

    const grant = await provider.createUploadGrant({
      pathname: 'v2/private/random-id', contentType: 'application/pdf', maximumSizeInBytes: 2048, validUntil
    })

    expect(grant.url).toBe('https://private.test/upload')
    expect(issueSignedToken).toHaveBeenCalledWith(expect.objectContaining({
      storeId: 'staging-store', pathname: 'v2/private/random-id', operations: ['put'], maximumSizeInBytes: 2048
    }))
    expect(presignUrl).toHaveBeenCalledTimes(1)
  })

  it('never returns an upload URL if the signed grant identifies Production storage', async () => {
    const presignUrl = vi.fn()
    const provider = createVercelPrivateBlobProvider({
      env: stagingEnv,
      sdk: {
        issueSignedToken: async () => ({ delegationToken: 'delegation', clientSigningToken: 'signer', validUntil: Date.now() + 30_000 }),
        parseStoreIdFromDelegationToken: () => 'production-store',
        presignUrl
      }
    })

    await expect(provider.createUploadGrant({
      pathname: 'v2/private/random-id', contentType: 'image/png', maximumSizeInBytes: 100, validUntil: Date.now() + 30_000
    })).rejects.toMatchObject({ code: 'blob_store_identity_mismatch' })
    expect(presignUrl).not.toHaveBeenCalled()
  })

  it('fails closed when the private store is missing or aliases the Production store', async () => {
    const provider = createVercelPrivateBlobProvider({ env: { ...stagingEnv, V2_PRIVATE_BLOB_STORE_ID: 'production-store' } })
    expect(() => provider.verifyIsolation()).toThrowError()
  })

  it('uses scoped short-lived signed URLs and reports that they are not immediately revocable', async () => {
    const now = 1_800_000_000_000
    const provider = {
      createReadGrant: vi.fn(async ({ validUntil }) => ({ url: 'https://private.test/read', expiresAt: new Date(validUntil) }))
    }
    const access = createStorageAccessAdapter({
      storageProvider: provider,
      authorizeRead: async () => true,
      grantTtlMs: 60_000,
      now: () => now
    })
    const result = await access.issueReadAccess({ identity: { userId: 'owner' }, attachment: { status: 'ready', pathname: 'opaque' } })

    expect(result).toMatchObject({ mode: 'signed-url', rechecksAuthorizationPerRequest: false, immediateRevocation: false })
    expect(result.expiresAt.getTime()).toBe(now + 60_000)
    expect(provider.createReadGrant).toHaveBeenCalledWith({ pathname: 'opaque', validUntil: now + 60_000 })
  })

  it('rejects expired signed grants and rechecks permission for every proxy request', async () => {
    const signed = createStorageAccessAdapter({
      storageProvider: { createReadGrant: async () => ({ url: 'expired', expiresAt: new Date(1) }) },
      authorizeRead: async () => true,
      now: () => 100
    })
    await expect(signed.issueReadAccess({ identity: { userId: 'owner' }, attachment: { status: 'ready', pathname: 'x' } }))
      .rejects.toMatchObject({ code: 'invalid_access_grant' })

    let permission = true
    const streamObject = vi.fn(async () => ({ stream: 'readable' }))
    const proxy = createStorageAccessAdapter({
      storageProvider: { streamObject },
      mode: 'authorization-proxy',
      authorizeRead: async () => permission
    })
    const attachment = { status: 'linked', pathname: 'private-path' }
    expect(await proxy.issueReadAccess({ identity: { userId: 'member' }, attachment }))
      .toMatchObject({ mode: 'authorization-proxy', rechecksAuthorizationPerRequest: true, permissionChangesApplyOnNextRequest: true })
    permission = false
    await expect(proxy.openAuthorizedStream({ identity: { userId: 'member' }, attachment })).rejects.toMatchObject({ status: 403 })
    expect(streamObject).not.toHaveBeenCalled()
  })

  it('sanitizes filenames and sniffs accepted formats by file signature', () => {
    expect(sanitizeFilename('../../invoice\r\n.pdf')).toBe('invoice.pdf')
    expect(detectContentType(Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe('application/pdf')
    expect(detectContentType(Buffer.from('<svg/onload=alert(1)>'))).toBeNull()
  })
})
