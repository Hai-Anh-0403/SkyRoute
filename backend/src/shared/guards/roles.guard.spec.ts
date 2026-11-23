import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainException } from '../exceptions/domain.exception';
import { RolesGuard } from './roles.guard';

function mockContext(role?: 'traveler' | 'admin'): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: role ? { userId: '1', email: 'u@skyroute.vn', role } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows unannotated routes regardless of user role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(mockContext())).toBe(true);
    expect(guard.canActivate(mockContext('traveler'))).toBe(true);
  });

  it('allows matching role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(mockContext('admin'))).toBe(true);
  });

  it('throws AUTH_004 (403) for traveler or missing user on admin routes', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['admin']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    for (const ctx of [mockContext('traveler'), mockContext()]) {
      try {
        guard.canActivate(ctx);
        fail('Expected DomainException');
      } catch (err) {
        expect(err).toBeInstanceOf(DomainException);
        const domainErr = err as DomainException;
        expect(domainErr.getStatus()).toBe(HttpStatus.FORBIDDEN);
        expect((domainErr.getResponse() as { code: string }).code).toBe(
          'AUTH_004',
        );
      }
    }
  });
});
