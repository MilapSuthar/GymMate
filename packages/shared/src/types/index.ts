export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserPublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  photos: string[];
  gymName: string | null;
  fitnessLevel: string | null;
  goals: string[];
  bio: string | null;
}
