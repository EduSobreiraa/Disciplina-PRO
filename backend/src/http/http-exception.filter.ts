import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import * as Sentry from '@sentry/nestjs'
import type { Request, Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp()
    const request = context.getRequest<Request>()
    const response = context.getResponse<Response>()
    const errorObject: object = typeof exception === 'object' && exception !== null ? exception : {}
    const rawStatus: unknown = 'status' in errorObject ? errorObject.status : undefined
    const statusCode = exception instanceof HttpException ? exception.getStatus() : typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus <= 599 ? rawStatus : HttpStatus.INTERNAL_SERVER_ERROR
    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : undefined
    const body: object = typeof exceptionResponse === 'object' && exceptionResponse !== null ? exceptionResponse : {}
    const bodyMessage: unknown = 'message' in body ? body.message : undefined
    const bodyCode: unknown = 'code' in body ? body.code : undefined
    const rawMessage = typeof exceptionResponse === 'string' ? exceptionResponse : bodyMessage
    const validationDetails = Array.isArray(rawMessage) ? rawMessage : undefined
    const requestId = typeof request.id === 'string' || typeof request.id === 'number' ? String(request.id) : undefined
    const code = validationDetails ? 'VALIDATION_ERROR' : typeof bodyCode === 'string' ? bodyCode : statusCode === 413 ? 'PAYLOAD_TOO_LARGE' : statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR'
    const message = validationDetails ? 'Dados inválidos' : statusCode === 413 ? 'Payload excede o limite permitido' : typeof rawMessage === 'string' ? rawMessage : statusCode >= 500 ? 'Erro interno do servidor' : 'Requisição inválida'

    if (statusCode >= 500) {
      Sentry.captureException(exception, {
        tags: { http_status_code: statusCode },
        contexts: {
          request: {
            requestId,
            method: request.method,
            path: request.path,
          },
        },
      })
    }

    response.status(statusCode).json({
      statusCode,
      code,
      message,
      ...(validationDetails ? { details: validationDetails } : {}),
      requestId,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
    })
  }
}
