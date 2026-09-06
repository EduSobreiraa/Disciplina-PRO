import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'
import type { Request, Response } from 'express'

type HttpExceptionPayload = string | object | undefined

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function statusCode(exception: unknown) {
  if (exception instanceof HttpException) return exception.getStatus()
  const rawStatus = asObject(exception).status
  return typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : HttpStatus.INTERNAL_SERVER_ERROR
}

function exceptionPayload(exception: unknown) {
  return exception instanceof HttpException ? exception.getResponse() : undefined
}

function errorDetails(payload: HttpExceptionPayload) {
  const bodyMessage = asObject(payload).message
  return Array.isArray(bodyMessage) ? bodyMessage : undefined
}

function errorCode(status: number, payload: HttpExceptionPayload, details: unknown[] | undefined) {
  if (details) return 'VALIDATION_ERROR'
  const bodyCode = asObject(payload).code
  if (typeof bodyCode === 'string') return bodyCode
  if (status === 413) return 'PAYLOAD_TOO_LARGE'
  return status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR'
}

function errorMessage(status: number, payload: HttpExceptionPayload, details: unknown[] | undefined) {
  if (details) return 'Dados inválidos'
  if (status === 413) return 'Payload excede o limite permitido'
  const rawMessage = typeof payload === 'string' ? payload : asObject(payload).message
  if (typeof rawMessage === 'string') return rawMessage
  return status >= 500 ? 'Erro interno do servidor' : 'Requisição inválida'
}

function requestIdentifier(request: Request) {
  return typeof request.id === 'string' || typeof request.id === 'number' ? String(request.id) : undefined
}

function captureServerException(exception: unknown, status: number, request: Request, requestId: string | undefined) {
  if (status < 500) return
  Sentry.captureException(exception, {
    tags: { http_status_code: status },
    contexts: {
      request: {
        requestId,
        method: request.method,
        path: request.path,
      },
    },
  })
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp()
    const request = context.getRequest<Request>()
    const response = context.getResponse<Response>()
    const status = statusCode(exception)
    const payload = exceptionPayload(exception)
    const validationDetails = errorDetails(payload)
    const requestId = requestIdentifier(request)
    const code = errorCode(status, payload, validationDetails)
    const message = errorMessage(status, payload, validationDetails)

    captureServerException(exception, status, request, requestId)

    response.status(status).json({
      statusCode: status,
      code,
      message,
      ...(validationDetails ? { details: validationDetails } : {}),
      requestId,
      timestamp: new Date().toISOString(),
      path: request.path,
    })
  }
}
