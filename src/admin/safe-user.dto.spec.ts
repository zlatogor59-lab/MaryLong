import { describe, expect, it } from 'vitest';
import { toSafeUserDto } from './safe-user.dto';

describe('admin user response', () => {
  it('AUTH-007 returns no medical or client fields', () => {
    const dto = toSafeUserDto({ id: 'u1', emailNormalized: 'safe@example.test', displayName: 'Synthetic Admin',
      role: 'admin', status: 'active', version: 1, medicalContext: 'must not leak', clientId: 'must not leak' });
    expect(dto).toEqual({ id: 'u1', email: 'safe@example.test', display_name: 'Synthetic Admin', role: 'admin', status: 'active', version: 1 });
    expect(dto).not.toHaveProperty('medicalContext');
    expect(dto).not.toHaveProperty('clientId');
  });
});
