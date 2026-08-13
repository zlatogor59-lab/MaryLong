import { afterEach, describe, expect, it } from 'vitest';
import { AuthConfigController } from './auth-config.controller';

const names = ['AUTH_ISSUER','AUTH_CLIENT_ID','AUTH_AUDIENCE','AUTH_AUTHORIZATION_ENDPOINT','AUTH_TOKEN_ENDPOINT','AUTH_LOGOUT_ENDPOINT','AUTH_REDIRECT_URI'] as const;
const original = Object.fromEntries(names.map(name => [name, process.env[name]]));
afterEach(() => names.forEach(name => original[name] === undefined ? delete process.env[name] : process.env[name] = original[name]));

describe('OIDC public configuration', () => {
  it('is disabled without non-secret SPA settings', () => {
    delete process.env.AUTH_ISSUER; delete process.env.AUTH_CLIENT_ID;
    expect(new AuthConfigController().config()).toEqual({ enabled:false });
  });
  it('returns only public PKCE configuration', () => {
    process.env.AUTH_ISSUER='https://identity.example/'; process.env.AUTH_CLIENT_ID='spa-client'; process.env.AUTH_AUDIENCE='api';
    expect(new AuthConfigController().config()).toEqual({enabled:true,issuer:'https://identity.example/',client_id:'spa-client',audience:'api',
      authorization_endpoint:'https://identity.example/authorize',token_endpoint:'https://identity.example/oauth/token',logout_endpoint:'https://identity.example/v2/logout',redirect_uri:'http://localhost:3000/',scope:'openid profile email'});
  });
});
