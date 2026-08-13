import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import type { AuthenticatedUser } from './auth.types';

const base: AuthenticatedUser = {
  id: '00000000-0000-0000-0000-000000000001', authSubject: 'synthetic', role: 'consultant',
  status: 'active', sessionIssuedAt: new Date('2026-08-13T10:00:00Z'), sessionRevokedAt: null,
};

describe('AuthService session checks', () => {
  const service = new AuthService({ findByAuthSubject: async () => null } as never);
  it('AUTH-001 accepts an active, non-revoked user', () => expect(() => service.assertActive(base)).not.toThrow());
  it.each(['invited', 'suspended', 'revoked'] as const)('AUTH-010 rejects status %s with ACCOUNT_INACTIVE', status => {
    expect(() => service.assertActive({ ...base, status })).toThrow('ACCOUNT_INACTIVE');
  });
  it('AUTH-003 rejects a session issued before revocation', () => {
    expect(() => service.assertActive({ ...base, sessionRevokedAt: new Date('2026-08-13T10:00:01Z') })).toThrow('INVALID_SESSION');
  });
  it('AUTH-004 accepts a session issued after revocation', () => {
    expect(() => service.assertActive({ ...base, sessionIssuedAt: new Date('2026-08-13T10:00:02Z'), sessionRevokedAt: new Date('2026-08-13T10:00:01Z') })).not.toThrow();
  });
});
