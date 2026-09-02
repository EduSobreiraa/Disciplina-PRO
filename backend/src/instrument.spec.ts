import { jest } from '@jest/globals'

interface TestSentryOptions {
  sendDefaultPii: boolean
  dataCollection: {
    userInfo: boolean
    cookies: boolean
    httpHeaders: { request: boolean; response: boolean }
    httpBodies: unknown[]
    urlQueryParams: boolean
    stackFrameVariables: boolean
  }
  beforeSend(event: Record<string, unknown>): Record<string, unknown>
  beforeSendSpan(span: { data: Record<string, unknown>; description?: string; op?: string }): { data: Record<string, unknown>; description?: string; op?: string }
  [key: string]: unknown
}

const init = jest.fn<(options: TestSentryOptions) => void>()

jest.unstable_mockModule('@sentry/nestjs', () => ({ init }))

process.env.SENTRY_ENVIRONMENT = 'lab'
await import('./instrument.js')
delete process.env.SENTRY_ENVIRONMENT

describe('Sentry instrumentation', () => {
  it('disables PII and all HTTP payload collection', () => {
    expect(init).toHaveBeenCalledTimes(1)
    const options = init.mock.calls[0][0]
    expect(options.environment).toBe('lab')
    expect(options.sendDefaultPii).toBe(false)
    expect(options.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    })
    const sanitized = options.beforeSend({
      request: { headers: { authorization: 'Bearer secret' }, cookies: { session: 'secret' }, data: { password: 'secret' } },
      user: { id: 'secret' },
      message: 'token=secret',
      logentry: { message: 'password=secret' },
      extra: { accessToken: 'secret' },
      breadcrumbs: [{ message: 'cookie=session=secret' }],
      transaction: '/auth?token=secret',
      contexts: { request: { requestId: 'request-123', authorization: 'Bearer secret' }, unsafe: { password: 'secret' } },
      exception: { values: [{ type: 'Error', value: 'Authentication failed with token=secret' }] },
    })
    expect(sanitized).toEqual({
      contexts: { request: { requestId: 'request-123' } },
      exception: { values: [{ type: 'Error', value: 'Unhandled server error' }] },
    })
    expect(JSON.stringify(sanitized)).not.toMatch(/Bearer secret|session=secret|password=secret|token=secret|accessToken/)

    const sanitizedSpan = options.beforeSendSpan({
      op: 'db.sql.query',
      description: 'SELECT * FROM users WHERE email = secret@example.test',
      data: { 'db.query.text': 'SELECT secret', 'url.full': 'https://api.example.test/users?token=secret' },
    })
    expect(sanitizedSpan).toEqual({
      op: 'db.sql.query',
      description: 'database operation',
      data: { 'url.full': 'https://api.example.test/users' },
    })
  })
})
