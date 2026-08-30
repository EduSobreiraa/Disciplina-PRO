import * as Sentry from '@sentry/nestjs'

const dsn = process.env.SENTRY_DSN?.trim()

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT?.trim() || process.env.DEPLOYMENT_STAGE?.trim() || process.env.NODE_ENV,
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
    // Defense in depth: integrations must not attach request data or user identity.
    delete event.user
    delete event.request
    return event
  },
})
