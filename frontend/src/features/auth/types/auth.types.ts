export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  preferences: Record<string, unknown>;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthSessionData {
  user: AuthUser;
  accessToken: string;
}
