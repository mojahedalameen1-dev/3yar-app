import { withV2Auth } from '../../../server/auth/v2-auth.js'
import { sendHttpError } from '../../../server/http/http-error.js'
import { createDefaultV2Services } from '../../../server/attachments/runtime.js'

export default withV2Auth(async (request, response, identity) => {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' })
  try {
    const result = await createDefaultV2Services().attachmentLifecycle.finalizeUpload({
      identity,
      attachmentId: request.body?.attachmentId,
      checksum: request.body?.checksum
    })
    return response.status(200).json(result)
  } catch (error) {
    return sendHttpError(response, error)
  }
})
