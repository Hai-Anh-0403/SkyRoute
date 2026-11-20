import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Domain exception carrying a feature error code (e.g. AUTH_001, DISC_003).
 * Formatted by AllExceptionsFilter into { success: false, error: { code, message, details } }.
 */
export class DomainException extends HttpException {
  constructor(
    code: string,
    message: string,
    status: HttpStatus,
    details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}
