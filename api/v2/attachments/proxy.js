import { Readable } from 'node:stream'
import { withV2Auth } from '../../../server/auth/v2-auth.js'
import { HttpError, sendHttpError } from '../../../server/http/http-error.js'
import { createDefaultV2Services } from '../../../server/attachments/runtime.js'

function queryValue(request, name) {
  return typeof request.query?.[name] === 'string' ? request.query[name] : ''
}

export default withV2Auth(async (request, response, identity) => {
  if (request.method !== 'GET') return response.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' })
  try {
    const services = createDefaultV2Services()
    const attachmentId = queryValue(request, 'attachmentId')
    const [streamed, snapshot] = await Promise.all([
      services.attachmentLifecycle.openAuthorizedReadStream({ identity, attachmentId }),
      services.attachmentLifecycle.getAttachment(attachmentId)
    ])
    if (!snapshot.exists) throw new HttpError(404, 'Attachment not found', 'not_found')
    const attachment = snapshot.data()
    response.setHeader('Cache-Control', 'private, no-store, max-age=0')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Content-Type', attachment.actualContentType || 'application/octet-stream')
    response.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.originalFilename || 'attachment')}`)
    response.setHeader('Content-Length', String(attachment.actualSize || 0))
    return Readable.fromWeb(streamed.stream).pipe(response)
  } catch (error) {
    return sendHttpError(response, error)
  }
})
