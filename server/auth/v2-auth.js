import { HttpError } from '../http/http-error.js'

function readAuthorizationHeader(request) {
  const headers = request?.headers
  return typeof headers?.get === 'function'
    ? headers.get('authorization') || ''
    : headers?.authorization || headers?.Authorization || ''
}

export function createV2Authenticator({ verifyIdToken }) {
  if (typeof verifyIdToken !== 'function') throw new TypeError('verifyIdToken is required')

  return async function authenticateV2(request) {
    const authorization = readAuthorizationHeader(request)
    const match = /^Bearer\s+(.+)$/i.exec(authorization)
    if (!match) throw new HttpError(401, 'Authentication required', 'unauthenticated')

    let claims
    try {
      claims = await verifyIdToken(match[1])
    } catch {
      throw new HttpError(401, 'Invalid authentication token', 'invalid_token')
    }

    if (typeof claims?.uid !== 'string' || !claims.uid) {
      throw new HttpError(401, 'Invalid authentication token', 'invalid_token')
    }

    // Identity is deliberately derived only from the verified Firebase claims.
    return Object.freeze({ userId: claims.uid, claims })
  }
}

export function requireV2Owner({ identity, resource, ownerField = 'userId' }) {
  if (!identity?.userId || typeof identity.userId !== 'string') {
    throw new HttpError(401, 'Authentication required', 'unauthenticated')
  }
  const ownerId = resource?.[ownerField]
  if (ownerId !== identity.userId) throw new HttpError(403, 'Resource access denied', 'forbidden')
  return true
}

export function requireV2Role({ identity, allowedRoles = [] }) {
  if (!identity?.userId) throw new HttpError(401, 'Authentication required', 'unauthenticated')
  const isAdmin = identity.claims?.admin === true
  const hasAllowedRole = allowedRoles.includes(identity.claims?.role)
  if (!isAdmin && !hasAllowedRole) throw new HttpError(403, 'Role access denied', 'forbidden')
  return true
}

export function assertV2MutationAllowed(resource) {
  const state = resource?.deletionState || 'active'
  if (state !== 'active') {
    throw new HttpError(409, 'Resource is pending deletion', 'resource_tombstoned')
  }
  return true
}

export function withV2Auth(handler, { verifyIdToken } = {}) {
  const verify = verifyIdToken || (async token => {
    const { adminAuth } = await import('../../api/_firebase-admin.js')
    return adminAuth().verifyIdToken(token)
  })
  const authenticate = createV2Authenticator({ verifyIdToken: verify })

  return async function v2Handler(request, response) {
    try {
      const identity = await authenticate(request)
      return await handler(request, response, identity)
    } catch (error) {
      const { sendHttpError } = await import('../http/http-error.js')
      return sendHttpError(response, error)
    }
  }
}
