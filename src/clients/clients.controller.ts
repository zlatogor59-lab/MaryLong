import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { ClientsRepository } from './clients.repository';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsRepository, private readonly policy: AuthorizationPolicy) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    this.policy.requireRole(user, 'consultant');
    const clients = await this.clients.listForConsultant(user.id);
    return {
      items: clients.map(client => ({
        id: client.id,
        label: `Клиент ${client.id.slice(0, 8)}`,
        status: client.status,
        version: client.version,
      })),
    };
  }
}
