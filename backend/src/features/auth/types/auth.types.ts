import { UserRole } from '../../../shared/decorators/roles.decorator';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  preferences: Record<string, unknown>;
  role: UserRole;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface ClientMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceName?: string | null;
}

export interface IssuedSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}
