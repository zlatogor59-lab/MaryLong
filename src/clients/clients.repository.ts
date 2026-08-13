import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface ScopedClient {
  id: string;
  status: 'prospect' | 'active' | 'archived';
  version: number;
}

@Injectable()
export class ClientsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listForConsultant(consultantUserId: string): Promise<ScopedClient[]> {
    return this.prisma.$queryRaw<ScopedClient[]>`
      SELECT c.id, c.status, c.version
      FROM clients c
      INNER JOIN consultant_client_assignments a ON a.client_id = c.id
      WHERE a.consultant_user_id = ${consultantUserId}::uuid
        AND a.status = 'active'
        AND c.status <> 'archived'
      ORDER BY c.created_at DESC, c.id DESC
      LIMIT 100
    `;
  }
}
