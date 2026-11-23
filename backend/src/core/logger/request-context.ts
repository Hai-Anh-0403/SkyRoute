import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
const VALID_REQUEST_ID = /^[A-Za-z0-9._-]{1,64}$/;

export interface RequestContextStore {
  requestId: string;
}

export const requestContextStorage =
  new AsyncLocalStorage<RequestContextStore>();

/** Accepts safe caller-provided correlation IDs or issues a new UUIDv4. */
export function sanitizeRequestId(raw?: string | string[]): string {
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = candidate?.trim();
  if (trimmed && VALID_REQUEST_ID.test(trimmed)) {
    return trimmed;
  }
  return randomUUID();
}

export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}

/** Attaches an x-request-id header and binds AsyncLocalStorage context for downstream logs. */
export function requestCorrelationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = sanitizeRequestId(req.headers[REQUEST_ID_HEADER]);
  (req as Request & { requestId?: string }).requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);

  requestContextStorage.run({ requestId }, () => next());
}
