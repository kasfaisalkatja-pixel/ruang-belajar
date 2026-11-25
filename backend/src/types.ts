export type UserRole = 'admin' | 'teacher' | 'student';

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  identityNumber?: string | null;
  gender?: string | null;
  mustChangePassword?: boolean;
}

export interface Bindings {
  DB: D1Database;
  JWT_SECRET: string;
  CORS_ORIGIN: string;
}

export interface Variables {
  user: AuthUser;
}
