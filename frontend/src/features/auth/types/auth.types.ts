export type BudgetPreference = 'low' | 'medium' | 'high';

export interface UserTravelPreferences {
  budget?: BudgetPreference;
  interests?: string[];
  preferIndoor?: boolean;
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  preferences: UserTravelPreferences;
}

export interface UpdateProfileRequest {
  fullName?: string;
  avatarUrl?: string;
  preferences?: UserTravelPreferences;
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
