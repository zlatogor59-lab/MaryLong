import { HttpStatus, Injectable } from '@nestjs/common';
import { AppError } from '../common/app-error';
import { UserRepository } from './user.repository';
import type { AuthenticatedUser } from './auth.types';

export interface TokenClaims { sub?: string; iat?: number }

@Injectable()
export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async resolveUser(claims: TokenClaims): Promise<AuthenticatedUser> {
    if (!claims.sub || !claims.iat) throw new AppError('INVALID_SESSION', HttpStatus.UNAUTHORIZED);
    const user = await this.users.findByAuthSubject(claims.sub, new Date(claims.iat * 1000));
    if (!user) throw new AppError('INVALID_SESSION', HttpStatus.UNAUTHORIZED, 'USER_NOT_PROVISIONED');
    return user;
  }

  assertActive(user: AuthenticatedUser): void {
    if (user.status !== 'active') throw new AppError('ACCOUNT_INACTIVE', HttpStatus.FORBIDDEN, `ACCOUNT_${user.status.toUpperCase()}`);
    if (user.sessionRevokedAt && user.sessionIssuedAt <= user.sessionRevokedAt) {
      throw new AppError('INVALID_SESSION', HttpStatus.UNAUTHORIZED, 'SESSION_REVOKED');
    }
  }
}
