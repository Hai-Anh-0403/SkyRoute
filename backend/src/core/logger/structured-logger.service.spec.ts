import { Request, Response } from 'express';
import {
  getRequestId,
  requestCorrelationMiddleware,
  sanitizeRequestId,
} from './request-context';
import {
  formatStructuredLog,
  redactSensitive,
} from './structured-logger.service';

describe('Structured Logging & Request Correlation', () => {
  describe('sanitizeRequestId', () => {
    it('keeps valid caller correlation IDs and rejects unsafe or overlong values', () => {
      expect(sanitizeRequestId('req-abc_123.xyz')).toBe('req-abc_123.xyz');

      const generated = sanitizeRequestId('bad\r\ninjection header');
      expect(generated).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );

      const tooLong = sanitizeRequestId('a'.repeat(100));
      expect(tooLong).not.toBe('a'.repeat(100));
    });
  });

  describe('requestCorrelationMiddleware', () => {
    it('echoes x-request-id header and binds AsyncLocalStorage context', (done) => {
      const setHeader = jest.fn();
      const req = {
        headers: { 'x-request-id': 'trace-sky-001' },
      } as unknown as Request;
      const res = { setHeader } as unknown as Response;

      requestCorrelationMiddleware(req, res, () => {
        expect(setHeader).toHaveBeenCalledWith('x-request-id', 'trace-sky-001');
        expect(getRequestId()).toBe('trace-sky-001');
        done();
      });
    });
  });

  describe('redactSensitive & formatStructuredLog', () => {
    it('redacts tokens, secrets, passwords, cookies, and prompt payloads', () => {
      const redacted = redactSensitive({
        requestId: 'trace-1',
        password: 'superSecretPassword',
        accessToken: 'jwt.token.value',
        authorization: 'Bearer secret',
        cookie: 'skyroute_rt=abc',
        geminiApiKey: 'AIza123',
        nested: {
          prompt: 'private user travel prompt',
          safeField: 'Da Lat',
        },
      }) as Record<string, unknown>;

      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.accessToken).toBe('[REDACTED]');
      expect(redacted.authorization).toBe('[REDACTED]');
      expect(redacted.cookie).toBe('[REDACTED]');
      expect(redacted.geminiApiKey).toBe('[REDACTED]');
      expect((redacted.nested as Record<string, unknown>).prompt).toBe(
        '[REDACTED]',
      );
      expect((redacted.nested as Record<string, unknown>).safeField).toBe(
        'Da Lat',
      );
    });

    it('outputs parseable single-line JSON with timestamp and metadata', () => {
      const line = formatStructuredLog({
        level: 'info',
        event: 'http.request.completed',
        requestId: 'req-42',
        feature: 'stays',
        action: 'GET /api/v1/stays',
        statusCode: 200,
        durationMs: 12,
        outcome: 'ok',
        token: 'should-hide',
      });

      const parsed = JSON.parse(line) as Record<string, unknown>;
      expect(typeof parsed.timestamp).toBe('string');
      expect(parsed.event).toBe('http.request.completed');
      expect(parsed.requestId).toBe('req-42');
      expect(parsed.token).toBe('[REDACTED]');
    });
  });
});
