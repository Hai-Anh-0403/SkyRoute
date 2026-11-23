import { Injectable, Logger } from '@nestjs/common';
import { getRequestId } from './request-context';

export type StructuredLogLevel = 'info' | 'warn' | 'error';

export interface StructuredLogInput {
  event: string;
  requestId?: string;
  feature?: string;
  action?: string;
  durationMs?: number;
  statusCode?: number;
  outcome?: 'ok' | 'error';
  [key: string]: unknown;
}

export interface StructuredLogEntry extends StructuredLogInput {
  level: StructuredLogLevel;
}

const SENSITIVE_KEY_PATTERN =
  /(password|secret|token|authorization|cookie|api[-_]?key|prompt)/i;
const MAX_REDACT_DEPTH = 6;

/** Recursively redacts credential, token, cookie, and prompt fields from log metadata. */
export function redactSensitive(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (depth >= MAX_REDACT_DEPTH) {
    return '[Truncated]';
  }
  if (seen.has(value)) {
    return '[Circular]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitive(item, depth + 1, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = '[REDACTED]';
    } else {
      out[key] = redactSensitive(val, depth + 1, seen);
    }
  }
  return out;
}

/** Formats an operational log entry as single-line JSON with timestamp and redaction applied. */
export function formatStructuredLog(entry: StructuredLogEntry): string {
  const sanitized = redactSensitive(entry) as Record<string, unknown>;
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    ...sanitized,
  });
}

@Injectable()
export class StructuredLoggerService {
  private readonly logger = new Logger('SkyRoute');

  private emit(level: StructuredLogLevel, entry: StructuredLogInput): void {
    const payload: StructuredLogEntry = {
      ...entry,
      level,
      requestId: entry.requestId ?? getRequestId(),
    };
    const formatted = formatStructuredLog(payload);
    if (level === 'error') {
      this.logger.error(formatted);
    } else if (level === 'warn') {
      this.logger.warn(formatted);
    } else {
      this.logger.log(formatted);
    }
  }

  log(entry: StructuredLogInput): void {
    this.emit('info', entry);
  }

  warn(entry: StructuredLogInput): void {
    this.emit('warn', entry);
  }

  error(entry: StructuredLogInput): void {
    this.emit('error', entry);
  }
}
