import { withV2Auth } from '../../../server/auth/v2-auth.js'
import { sendHttpError } from '../../../server/http/http-error.js'
import { createDefaultV2Services } from '../../../server/attachments/runtime.js'

function queryValue(request, name) {
  return typeof request.query?.[name] === 'string' ? request.query[name] : ''
}

export default withV2Auth(async (request, response, identity) => {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' })
  try {
    const result = await createDefaultV2Services().attachmentLifecycle.issueReadAccess({
      identity,
      attachmentId: queryValue(request, 'attachmentId')
    })
    response.setHeader('Cache-Control', 'private, no-store, max-age=0')
    return response.status(200).json(result)
  } catch (error) {
    return sendHttpError(response, error)
  }
})
