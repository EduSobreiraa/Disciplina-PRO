import type { ReadableSpan, SpanProcessor } from '@opentelemetry/sdk-trace-base'
import { jest } from '@jest/globals'
import { SanitizingSpanProcessor, createOpenTelemetryOptions, sanitizeSpan } from './telemetry.js'

function testSpan(): ReadableSpan {
  return {
    name: 'SELECT * FROM users WHERE email = secret@example.test',
    attributes: {
      'http.request.method': 'GET',
      'url.full': 'https://api.example.test/users?token=secret#private',
      'http.request.header.authorization': ['Bearer secret'],
      'db.query.text': 'SELECT * FROM users WHERE email = secret@example.test',
      'client.address': '192.0.2.1',
      'service.operation': 'users.read',
    },
    events: [{ name: 'exception', time: [0, 0], attributes: { 'exception.message': 'token=secret', token: 'secret' }, droppedAttributesCount: 0 }],
    links: [],
  } as unknown as ReadableSpan
}

describe('OpenTelemetry', () => {
  it('remains disabled without an OTLP traces endpoint', () => {
    expect(createOpenTelemetryOptions({})).toEqual({ spanProcessors: undefined, tracesSampleRate: undefined })
  })

  it('requires a secure endpoint in production', () => {
    expect(() => createOpenTelemetryOptions({ NODE_ENV: 'production', OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://collector.test/v1/traces' })).toThrow('HTTPS em produção')
  })

  it('validates the configured sampling ratio', () => {
    expect(() => createOpenTelemetryOptions({ OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://localhost:4318/v1/traces', OTEL_TRACES_SAMPLER_ARG: '1.1' })).toThrow('entre 0 e 1')
  })

  it('rejects sampler modes that are not implemented by the shared Sentry provider', () => {
    expect(() => createOpenTelemetryOptions({
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://localhost:4318/v1/traces',
      OTEL_TRACES_SAMPLER: 'always_on',
    })).toThrow('parentbased_traceidratio')
  })

  it('enables one sanitizing processor with the configured sampling ratio', () => {
    const options = createOpenTelemetryOptions({
      OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://localhost:4318/v1/traces',
      OTEL_TRACES_SAMPLER_ARG: '0.25',
    })
    expect(options.tracesSampleRate).toBe(0.25)
    expect(options.spanProcessors).toHaveLength(1)
    expect(options.spanProcessors?.[0]).toBeInstanceOf(SanitizingSpanProcessor)
  })

  it('removes sensitive attributes and URL queries before export', () => {
    const span = testSpan()
    sanitizeSpan(span)
    expect(span.attributes).toEqual({
      'http.request.method': 'GET',
      'url.full': 'https://api.example.test/users',
      'service.operation': 'users.read',
    })
    expect(span.name).toBe('database operation')
    expect(span.events[0].attributes).toEqual({})
  })

  it('sanitizes before delegating to the batch processor', () => {
    const onEnd = jest.fn()
    const delegate = {
      onStart: jest.fn(),
      onEnd,
      forceFlush: jest.fn(() => Promise.resolve()),
      shutdown: jest.fn(() => Promise.resolve()),
    } satisfies SpanProcessor
    const span = testSpan()
    new SanitizingSpanProcessor(delegate).onEnd(span)
    expect(onEnd).toHaveBeenCalledWith(span)
    expect(JSON.stringify(onEnd.mock.calls)).not.toContain('Bearer secret')
  })
})
