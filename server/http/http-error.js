export class HttpError extends Error {
  constructor(status, message, code = 'request_failed') {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
  }
}

export function sendHttpError(response, error) {
  const status = Number.isInteger(error?.status) ? error.status : 500
  const code = typeof error?.code === 'string' ? error.code : 'internal_error'
  const message = status >= 500 ? 'Internal server error' : error.message
  return response.status(status).json({ error: message, code })
}
