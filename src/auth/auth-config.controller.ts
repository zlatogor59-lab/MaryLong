import { Controller, Get } from '@nestjs/common';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthConfigController {
  @Public()
  @Get('config')
  config() {
    const issuer = process.env.AUTH_ISSUER?.trim();
    const clientId = process.env.AUTH_CLIENT_ID?.trim();
    if (!issuer || !clientId) return { enabled: false };
    const base = issuer.endsWith('/') ? issuer : `${issuer}/`;
    return {
      enabled: true,
      issuer: base,
      client_id: clientId,
      audience: process.env.AUTH_AUDIENCE?.trim() || null,
      authorization_endpoint: process.env.AUTH_AUTHORIZATION_ENDPOINT?.trim() || `${base}authorize`,
      token_endpoint: process.env.AUTH_TOKEN_ENDPOINT?.trim() || `${base}oauth/token`,
      logout_endpoint: process.env.AUTH_LOGOUT_ENDPOINT?.trim() || `${base}v2/logout`,
      redirect_uri: process.env.AUTH_REDIRECT_URI?.trim() || 'http://localhost:3000/',
      scope: 'openid profile email',
    };
  }
}
