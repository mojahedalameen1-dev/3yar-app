import { withV2Auth } from '../../../server/auth/v2-auth.js'
import { sendHttpError } from '../../../server/http/http-error.js'
import { createDefaultV2Services } from '../../../server/attachments/runtime.js'

function header(request, name) {
  return typeof request.headers?.get === 'function'
    ? request.headers.get(name)
    : request.headers?.[name.toLowerCase()]
}

export default withV2Auth(async (request, response, identity) => {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' })
  try {
    const result = await createDefaultV2Services().attachmentLifecycle.createUploadGrant({
      identity,
      key: header(request, 'idempotency-key'),
      filename: request.body?.filename,
      contentType: request.body?.contentType,
      size: request.body?.size
    })
    response.setHeader('Cache-Control', 'private, no-store, max-age=0')
    return response.status(201).json(result)
  } catch (error) {
    return sendHttpError(response, error)
  }
})
