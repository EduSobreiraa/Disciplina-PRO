import { Writable } from 'node:stream'
import pino from 'pino'
import { LOG_REDACTION_PATHS, sanitizeLoggedRequest } from './log-redaction.js'

describe('log redaction', () => {
  it('removes credentials, cookies, CSRF and query parameters', () => {
    let output = ''
    const destination = new Writable({
      write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        output += Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk)
        callback()
      },
    })
    const logger = pino({
      serializers: { req: sanitizeLoggedRequest },
      redact: { paths: LOG_REDACTION_PATHS, censor: '[REDACTED]' },
    }, destination)

    logger.info({
      req: {
        url: '/api/invitations/accept?token=query-secret',
        query: { token: 'query-object-secret' },
        headers: {
          authorization: 'Bearer access-secret',
          cookie: 'dp_refresh=refresh-secret',
          'x-csrf-token': 'csrf-secret',
        },
        body: { password: 'password-secret', token: 'invitation-secret' },
      },
      SMTP_AUTH_PASSWORD: 'smtp-secret',
    })

    expect(output).toContain('/api/invitations/accept')
    expect(output).toContain('[REDACTED]')
    for (const secret of ['query-secret', 'query-object-secret', 'access-secret', 'refresh-secret', 'csrf-secret', 'password-secret', 'invitation-secret', 'smtp-secret']) {
      expect(output).not.toContain(secret)
    }
  })
})
