export type UserRole = 'admin' | 'consultant' | 'client';
export type UserStatus = 'invited' | 'active' | 'suspended' | 'revoked';

export interface AuthenticatedUser {
  id: string;
  authSubject: string;
  role: UserRole;
  status: UserStatus;
  sessionIssuedAt: Date;
  sessionRevokedAt: Date | null;
}
