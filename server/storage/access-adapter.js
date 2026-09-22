import { HttpError } from '../http/http-error.js'

export function createStorageAccessAdapter({ storageProvider, mode = 'signed-url', authorizeRead, grantTtlMs = 5 * 60 * 1000, now = () => Date.now() }) {
  if (!storageProvider || typeof authorizeRead !== 'function') throw new TypeError('storageProvider and authorizeRead are required')
  if (!['signed-url', 'authorization-proxy'].includes(mode)) throw new TypeError('Unknown storage access mode')

  return {
    async issueReadAccess({ identity, attachment }) {
      if (!await authorizeRead({ identity, attachment })) throw new HttpError(403, 'Attachment access denied', 'forbidden')
      if (!['ready', 'linked'].includes(attachment.status)) throw new HttpError(404, 'Attachment is unavailable', 'attachment_unavailable')

      if (mode === 'authorization-proxy') {
        return {
          mode,
          pathname: attachment.pathname,
          rechecksAuthorizationPerRequest: true,
          permissionChangesApplyOnNextRequest: true,
          currentTransfersCanFinish: true
        }
      }

      const validUntil = now() + grantTtlMs
      const grant = await storageProvider.createReadGrant({ pathname: attachment.pathname, validUntil })
      const expiresAt = grant.expiresAt instanceof Date ? grant.expiresAt : grant.expiresAt?.toDate?.()
      if (!expiresAt || expiresAt.getTime() <= now() || expiresAt.getTime() > validUntil) {
        throw new HttpError(503, 'Storage returned an invalid access grant', 'invalid_access_grant')
      }
      return {
        mode,
        url: grant.url,
        expiresAt,
        rechecksAuthorizationPerRequest: false,
        immediateRevocation: false
      }
    },

    async openAuthorizedStream({ identity, attachment }) {
      if (mode !== 'authorization-proxy') throw new HttpError(409, 'This route is not configured for proxy access', 'access_mode_mismatch')
      if (!await authorizeRead({ identity, attachment })) throw new HttpError(403, 'Attachment access denied', 'forbidden')
      if (!['ready', 'linked'].includes(attachment.status)) throw new HttpError(404, 'Attachment is unavailable', 'attachment_unavailable')
      return storageProvider.streamObject(attachment.pathname)
    }
  }
}
