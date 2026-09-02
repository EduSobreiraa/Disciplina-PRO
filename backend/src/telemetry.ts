import type { Context } from '@opentelemetry/api'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor, type ReadableSpan, type SpanProcessor } from '@opentelemetry/sdk-trace-base'

const DEFAULT_SAMPLE_RATE = 0.1
const SENSITIVE_ATTRIBUTE_PATTERNS = [
  /^(?:db\.statement|db\.query\.text)$/u,
  /^(?:http\.(?:request|response)\.body|http\.(?:request|response)\.header\.)/u,
  /^(?:client\.address|network\.peer\.address|user_agent\.original)$/u,
  /^exception\.(?:message|stacktrace)$/u,
  /^(?:enduser|user)\./u,
  /(?:^|\.)(?:authorization|cookie|email|password|secret|token)$/u,
]
const URL_ATTRIBUTE_NAMES = new Set(['http.url', 'url.full'])

type MutableAttributes = Record<string, unknown>

function sanitizeUrl(value: unknown) {
  if (typeof value !== 'string') return undefined
  try {
    const url = new URL(value)
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return undefined
  }
}

export function sanitizeTelemetryAttributes(attributes: Record<string, unknown>) {
  const mutable = attributes as MutableAttributes
  for (const [name, value] of Object.entries(mutable)) {
    if (SENSITIVE_ATTRIBUTE_PATTERNS.some((pattern) => pattern.test(name))) {
      delete mutable[name]
      continue
    }
    if (URL_ATTRIBUTE_NAMES.has(name)) {
      const sanitized = sanitizeUrl(value)
      if (sanitized) mutable[name] = sanitized
      else delete mutable[name]
    }
  }
}

export function sanitizeSpan(span: ReadableSpan) {
  const containsDatabaseStatement = 'db.statement' in span.attributes || 'db.query.text' in span.attributes
  if (containsDatabaseStatement) (span as ReadableSpan & { name: string }).name = 'database operation'
  sanitizeTelemetryAttributes(span.attributes)
  for (const event of span.events) sanitizeTelemetryAttributes(event.attributes ?? {})
  for (const link of span.links) sanitizeTelemetryAttributes(link.attributes ?? {})
}

export class SanitizingSpanProcessor implements SpanProcessor {
  constructor(private readonly delegate: SpanProcessor) {}

  onStart(span: Parameters<SpanProcessor['onStart']>[0], parentContext: Context) {
    this.delegate.onStart(span, parentContext)
  }

  onEnd(span: ReadableSpan) {
    sanitizeSpan(span)
    this.delegate.onEnd(span)
  }

  forceFlush() {
    return this.delegate.forceFlush()
  }

  shutdown() {
    return this.delegate.shutdown()
  }
}

function parseSampleRate(value: string | undefined) {
  if (!value?.trim()) return DEFAULT_SAMPLE_RATE
  const rate = Number(value)
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new Error('OTEL_TRACES_SAMPLER_ARG deve ser um número entre 0 e 1')
  }
  return rate
}

function validateSampler(value: string | undefined) {
  const sampler = value?.trim() || 'parentbased_traceidratio'
  if (sampler !== 'parentbased_traceidratio') {
    throw new Error('OTEL_TRACES_SAMPLER deve ser parentbased_traceidratio')
  }
}

export function createOpenTelemetryOptions(environment: NodeJS.ProcessEnv = process.env) {
  const endpoint = environment.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?.trim()
  if (!endpoint) return { spanProcessors: undefined, tracesSampleRate: undefined }

  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    throw new Error('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT deve ser uma URL válida')
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT deve usar HTTP(S)')
  }
  if (environment.NODE_ENV === 'production' && url.protocol !== 'https:') {
    throw new Error('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT deve usar HTTPS em produção')
  }

  validateSampler(environment.OTEL_TRACES_SAMPLER)
  const exporter = new OTLPTraceExporter({ url: endpoint })
  const processor = new SanitizingSpanProcessor(new BatchSpanProcessor(exporter))
  return {
    spanProcessors: [processor],
    tracesSampleRate: parseSampleRate(environment.OTEL_TRACES_SAMPLER_ARG),
  }
}
