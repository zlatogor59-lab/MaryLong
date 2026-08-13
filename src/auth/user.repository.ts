import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { AuthenticatedUser, UserRole, UserStatus } from './auth.types';

type UserRow = { id: string; auth_subject: string; role: UserRole; status: UserStatus; session_revoked_at: Date | null };

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAuthSubject(subject: string, issuedAt: Date): Promise<AuthenticatedUser | null> {
    const rows = await this.prisma.$queryRaw<UserRow[]>`
      SELECT id, auth_subject, role, status, session_revoked_at FROM users WHERE auth_subject = ${subject} LIMIT 1
    `;
    const row = rows[0];
    return row ? { id: row.id, authSubject: row.auth_subject, role: row.role, status: row.status,
      sessionIssuedAt: issuedAt, sessionRevokedAt: row.session_revoked_at } : null;
  }
}
