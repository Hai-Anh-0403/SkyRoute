import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { getRequestId } from '../../core/logger/request-context';
import { formatStructuredLog } from '../../core/logger/structured-logger.service';
import { AuthUserPayload } from '../decorators/current-user.decorator';

function extractFeature(path: string): string {
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'api' && parts[1] === 'v1' && parts[2]) {
    return parts[2];
  }
  return parts[0] ?? 'root';
}

function extractErrorCode(err: unknown): string | undefined {
  if (err instanceof HttpException) {
    const res = err.getResponse();
    if (res && typeof res === 'object' && 'code' in res) {
      return String((res as { code: unknown }).code);
    }
  }
  return undefined;
}

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<{
      method: string;
      path?: string;
      url?: string;
      requestId?: string;
      user?: AuthUserPayload;
    }>();
    const res = http.getResponse<{ statusCode?: number }>();

    const startedAt = Date.now();
    const pathOnly = req.path ?? (req.url ?? '/').split('?')[0];
    const feature = extractFeature(pathOnly);
    const action = `${req.method} ${pathOnly}`;
    const requestId = getRequestId() ?? req.requestId;
    const userId = req.user?.userId;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            formatStructuredLog({
              level: 'info',
              event: 'http.request.completed',
              requestId,
              feature,
              action,
              statusCode: res.statusCode ?? 200,
              durationMs: Date.now() - startedAt,
              outcome: 'ok',
              ...(userId ? { userId } : {}),
            }),
          );
        },
        error: (err: unknown) => {
          const statusCode =
            err instanceof HttpException ? err.getStatus() : 500;
          const errorCode = extractErrorCode(err);
          const payload = formatStructuredLog({
            level: statusCode >= 500 ? 'error' : 'warn',
            event: 'http.request.failed',
            requestId,
            feature,
            action,
            statusCode,
            durationMs: Date.now() - startedAt,
            outcome: 'error',
            ...(errorCode ? { errorCode } : {}),
            ...(userId ? { userId } : {}),
          });
          if (statusCode >= 500) {
            this.logger.error(payload);
          } else {
            this.logger.warn(payload);
          }
        },
      }),
    );
  }
}
