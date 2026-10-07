export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = undefined) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve().then(() => handler(req, res, next)).catch(next)
}

export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, 'ROUTE_NOT_FOUND'))
}

export const errorHandler = (error, _req, res, _next) => {
  const isParseError = error.type === 'entity.parse.failed'
  const isTooLarge = error.type === 'entity.too.large'
  const isKnown = error instanceof AppError
  const status = isKnown ? error.statusCode : isParseError ? 400 : isTooLarge ? 413 : 500
  const message = isKnown ? error.message : isParseError ? 'Request body contains invalid JSON' : isTooLarge ? 'Request body is too large' : 'Something went wrong'
  const code = isKnown ? error.code : isParseError ? 'INVALID_JSON' : isTooLarge ? 'BODY_TOO_LARGE' : 'INTERNAL_ERROR'

  if (status >= 500) console.error('API request failed. Check local data files and permissions; private error details are omitted.')

  const response = { success: false, message, code }
  if (status < 500 && isKnown && error.details) response.details = error.details
  res.status(status).json(response)
}
