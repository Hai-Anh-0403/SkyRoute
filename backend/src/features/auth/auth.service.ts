import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { DomainException } from '../../shared/exceptions/domain.exception';
import { LoginDto, RegisterDto, UpdateProfileDto } from './dto/auth.dto';
import { User } from './entities/user.entity';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { UserRepository } from './repositories/user.repository';
import {
  ClientMeta,
  IssuedSession,
  JwtAccessPayload,
  PublicUser,
} from './types/auth.types';

const BCRYPT_ROUNDS = 10;
const REFRESH_TOKEN_BYTES = 48; // 96 hex chars

/** Parses durations like "15m", "7d", "12h" into milliseconds. */
export function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration format: ${value}`);
  }
  const amount = Number(match[1]);
  const unitMs = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 }[
    match[2] as 's' | 'm' | 'h' | 'd'
  ];
  return amount * unitMs;
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UserRepository,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto, meta: ClientMeta = {}): Promise<IssuedSession> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new DomainException(
        'AUTH_005',
        'Email already registered',
        HttpStatus.CONFLICT,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName.trim(),
    });

    this.logger.log(`[Auth] register - userId=${user.id}`);
    return this.issueSession(user, meta);
  }

  async login(dto: LoginDto, meta: ClientMeta = {}): Promise<IssuedSession> {
    const user = await this.users.findByEmail(dto.email);
    // Same error for unknown user, inactive user and wrong password (no user enumeration).
    const passwordOk =
      user && user.isActive
        ? await bcrypt.compare(dto.password, user.passwordHash)
        : false;

    if (!user || !passwordOk) {
      throw new DomainException(
        'AUTH_001',
        'Invalid email or password',
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.logger.log(`[Auth] login - userId=${user.id}`);
    return this.issueSession(user, meta);
  }

  /** Validates the refresh token, revokes it (rotation) and issues a new session. */
  async refresh(
    rawToken: string | undefined,
    meta: ClientMeta = {},
  ): Promise<IssuedSession> {
    if (!rawToken) {
      throw this.invalidRefresh();
    }

    const stored = await this.refreshTokens.findByHash(sha256(rawToken));
    if (!stored || stored.isRevoked || stored.expiresAt.getTime() <= Date.now()) {
      throw this.invalidRefresh();
    }

    const user = await this.users.findActiveById(stored.userId);
    if (!user) {
      throw this.invalidRefresh();
    }

    await this.refreshTokens.revokeById(stored.id);
    return this.issueSession(user, meta);
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) {
      return;
    }
    await this.refreshTokens.revokeByHash(sha256(rawToken));
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokens.revokeAllForUser(userId);
    this.logger.log(`[Auth] logout-all - userId=${userId}`);
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.users.findActiveById(userId);
    if (!user) {
      throw this.invalidRefresh();
    }
    return this.toPublicUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    const user = await this.users.update(userId, dto);
    if (!user) {
      throw this.invalidRefresh();
    }
    return this.toPublicUser(user);
  }

  private async issueSession(user: User, meta: ClientMeta): Promise<IssuedSession> {
    const payload: JwtAccessPayload = { sub: user.id, email: user.email };
    const accessExpiresInSec = Math.floor(
      parseDurationMs(this.config.get<string>('JWT_ACCESS_EXPIRES_IN', '15m')) /
        1000,
    );
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresInSec,
    });

    const refreshToken = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const refreshExpiresAt = new Date(
      Date.now() +
        parseDurationMs(this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d')),
    );

    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: sha256(refreshToken),
      expiresAt: refreshExpiresAt,
      deviceName: meta.deviceName ?? null,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    });

    return {
      user: this.toPublicUser(user),
      accessToken,
      refreshToken,
      refreshExpiresAt,
    };
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      preferences: user.preferences,
    };
  }

  private invalidRefresh(): DomainException {
    return new DomainException(
      'AUTH_003',
      'Invalid or revoked refresh token',
      HttpStatus.UNAUTHORIZED,
    );
  }
}
