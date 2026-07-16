import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'

export function requestIdMiddleware(request: Request, response: Response, next: NextFunction) {
  const incomingId = request.header('x-request-id')
  const existingId = typeof request.id === 'string' || typeof request.id === 'number' ? String(request.id) : undefined
  const candidate = incomingId ?? existingId
  const requestId = candidate && candidate.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(candidate) ? candidate : randomUUID()

  Object.assign(request, { id: requestId })
  response.setHeader('x-request-id', requestId)
  next()
}
