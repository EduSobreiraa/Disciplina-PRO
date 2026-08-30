import { BadRequestException } from '@nestjs/common'
import { jest } from '@jest/globals'

const captureException = jest.fn()

jest.unstable_mockModule('@sentry/nestjs', () => ({ captureException }))

const { HttpExceptionFilter } = await import('./http-exception.filter.js')

function catchException(exception: unknown) {
  const request = {
    id: 'request-123',
    method: 'POST',
    path: '/api/auth/login',
    headers: { authorization: 'Bearer secret', cookie: 'session=secret' },
    body: { password: 'secret', token: 'secret' },
  }
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  }
  response.status.mockReturnValue(response)
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  }

  new HttpExceptionFilter().catch(exception, host as never)
}

describe('HttpExceptionFilter Sentry reporting', () => {
  beforeEach(() => captureException.mockClear())

  it('does not report operational 4xx errors', () => {
    catchException(new BadRequestException('Falha controlada'))
    expect(captureException).not.toHaveBeenCalled()
  })

  it('reports unexpected 5xx errors without credentials or authentication bodies', () => {
    catchException(new Error('Falha inesperada'))

    expect(captureException).toHaveBeenCalledTimes(1)
    const context = captureException.mock.calls[0][1]
    expect(context).toEqual({
      tags: { http_status_code: 500 },
      contexts: { request: { requestId: 'request-123', method: 'POST', path: '/api/auth/login' } },
    })
    expect(JSON.stringify(context)).not.toMatch(/Bearer secret|session=secret|password|token/)
  })
})
