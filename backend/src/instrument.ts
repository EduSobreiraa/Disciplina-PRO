import * as Sentry from '@sentry/nestjs'
import { createOpenTelemetryOptions, sanitizeTelemetryAttributes } from './telemetry.js'

const dsn = process.env.SENTRY_DSN?.trim()
const openTelemetry = createOpenTelemetryOptions()

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT?.trim() || process.env.DEPLOYMENT_STAGE?.trim() || process.env.NODE_ENV,
  tracesSampleRate: openTelemetry.tracesSampleRate,
  openTelemetrySpanProcessors: openTelemetry.spanProcessors,
  beforeSendSpan(span) {
    sanitizeTelemetryAttributes(span.data)
    if (span.op?.startsWith('db')) span.description = 'database operation'
    return span
  },
  sendDefaultPii: false,
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: { request: false, response: false },
    httpBodies: [],
    urlQueryParams: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    databaseQueryData: false,
    stackFrameVariables: false,
    frameContextLines: 0,
  },
  beforeSend(event) {
    const requestId = event.contexts?.request?.requestId

    // Keep only correlation metadata; exception text and auxiliary payloads may contain secrets.
    delete event.user
    delete event.request
    delete event.message
    delete event.logentry
    delete event.extra
    delete event.breadcrumbs
    delete event.transaction
    event.exception?.values?.forEach((value) => { value.value = 'Unhandled server error' })
    event.contexts = typeof requestId === 'string' ? { request: { requestId } } : {}
    return event
  },
})
