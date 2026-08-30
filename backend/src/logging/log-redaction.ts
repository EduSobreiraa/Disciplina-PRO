export const LOG_REDACTION_PATHS: string[] = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.x-csrf-token',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.token',
  'req.body.accessToken',
  'req.body.refreshToken',
  'res.headers.set-cookie',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'JWT_PRIVATE_KEY_BASE64',
  'REFRESH_TOKEN_PEPPER',
  'INVITATION_TOKEN_PEPPER',
  'SMTP_AUTH_PASSWORD',
]

export function sanitizeLoggedRequest(request: Record<string, unknown>) {
  const url = typeof request.url === 'string' ? request.url.split('?', 1)[0] : request.url
  const sanitized: Record<string, unknown> = { ...request, url }
  delete sanitized.query
  return sanitized
}
