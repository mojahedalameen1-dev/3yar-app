import { withV2Auth, requireV2Role } from '../../../server/auth/v2-auth.js'
import { HttpError, sendHttpError } from '../../../server/http/http-error.js'
import { createDefaultV2Services } from '../../../server/attachments/runtime.js'

export default withV2Auth(async (request, response, identity) => {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' })
  try {
    requireV2Role({ identity, allowedRoles: ['admin'] })
    const services = createDefaultV2Services()
    if (!services.assertStagingFirebaseIsolated()) throw new HttpError(403, 'Cascade deletion is limited to isolated Staging', 'staging_only')
    const result = request.body?.resume === true
      ? await services.cascadeDeletion.resume(request.body?.jobId)
      : await services.cascadeDeletion.processNextBatch(request.body?.jobId)
    return response.status(200).json(result)
  } catch (error) {
    return sendHttpError(response, error)
  }
})
