import type { UserRole, UserStatus } from '../auth/auth.types';

export interface UserManagementRecord {
  id: string; emailNormalized: string; displayName: string; role: UserRole; status: UserStatus; version: number;
  [key: string]: unknown;
}

export const toSafeUserDto = (user: UserManagementRecord) => ({
  id: user.id, email: user.emailNormalized, display_name: user.displayName,
  role: user.role, status: user.status, version: user.version,
});
