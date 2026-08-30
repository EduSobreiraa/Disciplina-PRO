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
  [key: string]: unknown
}

const init = jest.fn<(options: TestSentryOptions) => void>()

jest.unstable_mockModule('@sentry/nestjs', () => ({ init }))

await import('./instrument.js')

describe('Sentry instrumentation', () => {
  it('disables PII and all HTTP payload collection', () => {
    expect(init).toHaveBeenCalledTimes(1)
    const options = init.mock.calls[0][0]
    expect(options.sendDefaultPii).toBe(false)
    expect(options.dataCollection).toMatchObject({
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      urlQueryParams: false,
      stackFrameVariables: false,
    })
    const sanitized = options.beforeSend({ request: { headers: { authorization: 'Bearer secret' }, data: { password: 'secret' } }, user: { id: 'secret' }, message: 'safe' })
    expect(sanitized).toEqual({ message: 'safe' })
  })
})
