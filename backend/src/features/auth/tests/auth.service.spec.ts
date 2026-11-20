import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { AuthService } from '../auth.service';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { UserRepository } from '../repositories/user.repository';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: '1',
    email: 'traveler@skyroute.vn',
    passwordHash: bcrypt.hashSync('securePassword123', 4),
    fullName: 'Nguyễn Văn A',
    avatarUrl: null,
    preferences: {},
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

async function expectDomainError(
  promise: Promise<unknown>,
  code: string,
  status: HttpStatus,
) {
  await expect(promise).rejects.toBeInstanceOf(DomainException);
  await promise.catch((e: DomainException) => {
    expect((e.getResponse() as { code: string }).code).toBe(code);
    expect(e.getStatus()).toBe(status);
  });
}

describe('AuthService', () => {
  let service: AuthService;
  let users: jest.Mocked<UserRepository>;
  let tokens: jest.Mocked<RefreshTokenRepository>;
  let jwt: jest.Mocked<JwtService>;

  beforeEach(() => {
    users = {
      findByEmail: jest.fn(),
      findActiveById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    tokens = {
      create: jest.fn().mockImplementation(async (d) => d),
      findByHash: jest.fn(),
      revokeById: jest.fn(),
      revokeByHash: jest.fn(),
      revokeAllForUser: jest.fn(),
    } as unknown as jest.Mocked<RefreshTokenRepository>;

    jwt = {
      signAsync: jest.fn().mockResolvedValue('signed.access.token'),
    } as unknown as jest.Mocked<JwtService>;

    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_SECRET: 'test_access_secret',
          JWT_ACCESS_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return values[key] ?? fallback;
      }),
    } as unknown as ConfigService;

    service = new AuthService(users, tokens, jwt, config);
  });

  describe('register', () => {
    it('creates a user with a bcrypt hash and issues a session', async () => {
      users.findByEmail.mockResolvedValue(null);
      users.create.mockImplementation(async (d) => buildUser({ ...d }));

      const session = await service.register({
        email: 'Traveler@SkyRoute.vn',
        password: 'securePassword123',
        fullName: 'Nguyễn Văn A',
      });

      const created = users.create.mock.calls[0][0];
      expect(created.passwordHash).not.toBe('securePassword123');
      expect(await bcrypt.compare('securePassword123', created.passwordHash)).toBe(true);
      expect(session.accessToken).toBe('signed.access.token');
      expect(session.refreshToken).toHaveLength(96);
      expect(session.user).not.toHaveProperty('passwordHash');
    });

    it('throws AUTH_005 (409) when the email already exists', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      await expectDomainError(
        service.register({
          email: 'traveler@skyroute.vn',
          password: 'securePassword123',
          fullName: 'A',
        }),
        'AUTH_005',
        HttpStatus.CONFLICT,
      );
    });
  });

  describe('login', () => {
    it('throws AUTH_001 (401) on wrong password', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      await expectDomainError(
        service.login({ email: 'traveler@skyroute.vn', password: 'wrong' }),
        'AUTH_001',
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('throws AUTH_001 (401) for unknown or inactive users', async () => {
      users.findByEmail.mockResolvedValue(buildUser({ isActive: false }));

      await expectDomainError(
        service.login({ email: 'traveler@skyroute.vn', password: 'securePassword123' }),
        'AUTH_001',
        HttpStatus.UNAUTHORIZED,
      );
    });

    it('stores only the SHA-256 hash of the refresh token', async () => {
      users.findByEmail.mockResolvedValue(buildUser());

      const session = await service.login({
        email: 'traveler@skyroute.vn',
        password: 'securePassword123',
      });

      const stored = tokens.create.mock.calls[0][0];
      expect(stored.tokenHash).toBe(sha256(session.refreshToken));
      expect(stored.tokenHash).not.toBe(session.refreshToken);
    });
  });

  describe('refresh', () => {
    const raw = 'a'.repeat(96);

    it('rotates the refresh token: revokes the old one and issues a new one', async () => {
      tokens.findByHash.mockResolvedValue({
        id: '10',
        userId: '1',
        tokenHash: sha256(raw),
        isRevoked: false,
        expiresAt: new Date(Date.now() + 60_000),
      } as RefreshToken);
      users.findActiveById.mockResolvedValue(buildUser());

      const session = await service.refresh(raw);

      expect(tokens.revokeById).toHaveBeenCalledWith('10');
      expect(session.refreshToken).not.toBe(raw);
    });

    it('throws AUTH_003 when the token is revoked', async () => {
      tokens.findByHash.mockResolvedValue({
        id: '10',
        userId: '1',
        isRevoked: true,
        expiresAt: new Date(Date.now() + 60_000),
      } as RefreshToken);

      await expectDomainError(service.refresh(raw), 'AUTH_003', HttpStatus.UNAUTHORIZED);
    });

    it('throws AUTH_003 when the token is expired', async () => {
      tokens.findByHash.mockResolvedValue({
        id: '10',
        userId: '1',
        isRevoked: false,
        expiresAt: new Date(Date.now() - 1000),
      } as RefreshToken);

      await expectDomainError(service.refresh(raw), 'AUTH_003', HttpStatus.UNAUTHORIZED);
    });

    it('throws AUTH_003 when no cookie token is provided', async () => {
      await expectDomainError(service.refresh(undefined), 'AUTH_003', HttpStatus.UNAUTHORIZED);
    });
  });

  describe('logout', () => {
    it('revokes only the presented token by hash', async () => {
      await service.logout('b'.repeat(96));
      expect(tokens.revokeByHash).toHaveBeenCalledWith(sha256('b'.repeat(96)));
    });

    it('logoutAll revokes every active token of the user', async () => {
      await service.logoutAll('1');
      expect(tokens.revokeAllForUser).toHaveBeenCalledWith('1');
    });
  });
});
