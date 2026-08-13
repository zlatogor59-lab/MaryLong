import { describe, expect, it } from 'vitest';
import { AuthorizationPolicy } from './authorization.policy';
import type { AuthenticatedUser, UserRole } from '../auth/auth.types';

const actor = (role: UserRole, id = 'user-1'): AuthenticatedUser => ({ id, role, authSubject: id, status: 'active', sessionIssuedAt: new Date(), sessionRevokedAt: null });
const policy = new AuthorizationPolicy();

describe('server authorization policies', () => {
  it('AUTH-005 masks a foreign report as 404', () => {
    expect(() => policy.requireClientReport(actor('client'), 'other-user', 'published')).toThrow('RESOURCE_UNAVAILABLE');
  });
  it('AUTH-006 denies admin access to medical context', () => {
    expect(() => policy.denyMedicalContextForAdmin(actor('admin'))).toThrow('RESOURCE_UNAVAILABLE');
  });
  it('AUTH-007 permits admin user-management role', () => {
    expect(() => policy.requireRole(actor('admin'), 'admin')).not.toThrow();
  });
  it('AUTH-008 denies mutation of immutable submissions', () => {
    expect(() => policy.denyImmutableSubmissionMutation()).toThrow('IMMUTABLE_RESOURCE');
  });
  it('AUTH-009 rechecks and rejects a closed assignment', () => {
    expect(() => policy.requireActiveAssignment(actor('consultant'), null)).toThrow('RESOURCE_UNAVAILABLE');
  });
});
