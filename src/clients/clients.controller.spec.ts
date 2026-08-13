import { describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { ClientsController } from './clients.controller';

const consultant: AuthenticatedUser = {
  id: '00000000-0000-0000-0000-000000000001', authSubject: 'synthetic', role: 'consultant', status: 'active',
  sessionIssuedAt: new Date(), sessionRevokedAt: null,
};

describe('consultant clients DTO', () => {
  it('returns only scoped safe fields', async () => {
    const controller = new ClientsController({ listForConsultant: async () => [{
      id: '12345678-0000-0000-0000-000000000000', status: 'active', version: 2,
    }] } as never, new AuthorizationPolicy());
    expect(await controller.list(consultant)).toEqual({ items: [{
      id: '12345678-0000-0000-0000-000000000000', label: 'Клиент 12345678', status: 'active', version: 2,
    }] });
  });

  it('does not allow a client role to list consultant scope', async () => {
    const controller = new ClientsController({ listForConsultant: async () => [] } as never, new AuthorizationPolicy());
    await expect(controller.list({ ...consultant, role: 'client' })).rejects.toThrow('RESOURCE_UNAVAILABLE');
  });
});
