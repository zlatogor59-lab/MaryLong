import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AuthService } from './auth.service';
import { IS_PUBLIC } from './public.decorator';
import { AppError } from '../common/app-error';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [context.getHandler(), context.getClass()])) return true;
    const req = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const match = req.header('authorization')?.match(/^Bearer (.+)$/i);
    if (!match) throw new AppError('INVALID_SESSION', HttpStatus.UNAUTHORIZED);
    const issuer = requiredEnv('AUTH_ISSUER');
    const audience = requiredEnv('AUTH_AUDIENCE');
    const jwks = createRemoteJWKSet(new URL(requiredEnv('AUTH_JWKS_URI')));
    let verified;
    try { verified = await jwtVerify(match[1], jwks, { issuer, audience }); }
    catch { throw new AppError('INVALID_SESSION', HttpStatus.UNAUTHORIZED, 'TOKEN_INVALID'); }
    const user = await this.auth.resolveUser(verified.payload);
    this.auth.assertActive(user);
    req.user = user;
    return true;
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
