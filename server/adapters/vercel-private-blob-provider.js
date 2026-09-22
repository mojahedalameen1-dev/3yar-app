import { createHash } from 'node:crypto'
import { del, get, head, issueSignedToken, list, parseStoreIdFromDelegationToken, presignUrl } from '@vercel/blob'
import { resolvePrivateBlobIsolation } from '../config/runtime-config.js'
import { detectContentType } from '../attachments/file-validation.js'
import { HttpError } from '../http/http-error.js'

const DEFAULT_GRANT_TTL_MS = 5 * 60 * 1000

function sha256Stream(stream) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const firstBytes = []
    let prefixSize = 0
    let size = 0
    ;(async () => {
      try {
        for await (const chunk of stream) {
          const bytes = Buffer.from(chunk)
          if (prefixSize < 32) {
            const prefix = bytes.subarray(0, 32 - prefixSize)
            firstBytes.push(prefix)
            prefixSize += prefix.length
          }
          size += bytes.length
          hash.update(bytes)
        }
        resolve({ checksum: hash.digest('hex'), size, detectedContentType: detectContentType(Buffer.concat(firstBytes)) })
      } catch (error) {
        reject(error)
      }
    })()
  })
}

export function createVercelPrivateBlobProvider({ env = process.env, sdk = {} } = {}) {
  const api = { del, get, head, issueSignedToken, list, parseStoreIdFromDelegationToken, presignUrl, ...sdk }

  function isolatedStore() {
    const isolation = resolvePrivateBlobIsolation(env)
    if (!isolation.allowed) {
      throw new HttpError(503, 'Private attachment storage is not isolated for this Preview environment', 'blob_store_not_isolated')
    }
    return isolation
  }

  function credentials(storeId) {
    if (env.VERCEL_OIDC_TOKEN) return { storeId, oidcToken: env.VERCEL_OIDC_TOKEN }
    return { storeId, token: env.V2_PRIVATE_BLOB_READ_WRITE_TOKEN }
  }

  function assertDelegationStore(token, expectedStoreId, baselineStoreId) {
    const issuedForStoreId = api.parseStoreIdFromDelegationToken(token.delegationToken)
    if (issuedForStoreId !== expectedStoreId || issuedForStoreId === baselineStoreId) {
      throw new HttpError(503, 'Vercel issued a Blob grant for an unexpected store', 'blob_store_identity_mismatch')
    }
  }

  async function assertOperationStore({ isolation, pathname, operations }) {
    const token = await api.issueSignedToken({
      ...credentials(isolation.storeId),
      pathname,
      operations,
      validUntil: Date.now() + 60_000
    })
    assertDelegationStore(token, isolation.storeId, isolation.baselineStoreId)
  }

  return {
    verifyIsolation() {
      const isolation = isolatedStore()
      return { allowed: true, privateStoreId: isolation.storeId, differsFromBaseline: isolation.storeId !== isolation.baselineStoreId }
    },

    async createUploadGrant({ pathname, contentType, maximumSizeInBytes, validUntil = Date.now() + DEFAULT_GRANT_TTL_MS }) {
      const isolation = isolatedStore()
      const { storeId } = isolation
      const auth = credentials(storeId)
      const token = await api.issueSignedToken({
        ...auth,
        pathname,
        operations: ['put'],
        validUntil,
        allowedContentTypes: [contentType],
        maximumSizeInBytes
      })
      assertDelegationStore(token, storeId, isolation.baselineStoreId)
      const result = await api.presignUrl(token, {
        access: 'private',
        operation: 'put',
        pathname,
        validUntil,
        allowedContentTypes: [contentType],
        maximumSizeInBytes,
        allowOverwrite: false,
        addRandomSuffix: false
      })
      return { url: result.presignedUrl, expiresAt: new Date(Math.min(validUntil, token.validUntil)) }
    },

    async createReadGrant({ pathname, validUntil = Date.now() + DEFAULT_GRANT_TTL_MS }) {
      const isolation = isolatedStore()
      const { storeId } = isolation
      const token = await api.issueSignedToken({
        ...credentials(storeId),
        pathname,
        operations: ['get'],
        validUntil
      })
      assertDelegationStore(token, storeId, isolation.baselineStoreId)
      const result = await api.presignUrl(token, {
        access: 'private',
        operation: 'get',
        pathname,
        validUntil,
        useCache: false
      })
      return { url: result.presignedUrl, expiresAt: new Date(Math.min(validUntil, token.validUntil)) }
    },

    async inspectObject(pathname) {
      const isolation = isolatedStore()
      const auth = credentials(isolation.storeId)
      await assertOperationStore({ isolation, pathname, operations: ['head', 'get'] })
      const metadata = await api.head(pathname, { ...auth, access: 'private' })
      const blob = await api.get(pathname, { ...auth, access: 'private', useCache: false })
      if (!blob || blob.statusCode !== 200) throw new HttpError(404, 'Uploaded file was not found', 'attachment_missing')
      const verified = await sha256Stream(blob.stream)
      if (verified.size !== metadata.size) throw new HttpError(422, 'Uploaded file changed during verification', 'attachment_changed_during_verification')
      return {
        size: verified.size,
        contentType: metadata.contentType,
        detectedContentType: verified.detectedContentType,
        checksum: verified.checksum,
        etag: metadata.etag
      }
    },

    async streamObject(pathname) {
      const isolation = isolatedStore()
      await assertOperationStore({ isolation, pathname, operations: ['get'] })
      const result = await api.get(pathname, { ...credentials(isolation.storeId), access: 'private', useCache: false })
      if (!result || result.statusCode !== 200) throw new HttpError(404, 'Attachment was not found', 'attachment_missing')
      return result
    },

    async removeObject(pathname, options = {}) {
      const isolation = isolatedStore()
      await assertOperationStore({ isolation, pathname, operations: ['delete'] })
      try {
        await api.del(pathname, { ...credentials(isolation.storeId), ...(options.etag ? { ifMatch: options.etag } : {}) })
        return { deleted: true }
      } catch (error) {
        if (error?.name === 'BlobNotFoundError' || error?.status === 404) return { deleted: true, alreadyMissing: true }
        throw error
      }
    },

    async listObjects({ prefix, cursor, limit = 1000 } = {}) {
      const isolation = isolatedStore()
      await assertOperationStore({ isolation, pathname: 'v2/private/__list_scope_probe__', operations: ['head'] })
      return api.list({ ...credentials(isolation.storeId), prefix, cursor, limit })
    }
  }
}

export { DEFAULT_GRANT_TTL_MS }
