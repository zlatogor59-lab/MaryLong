import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import type { UserRole } from '../auth/auth.types';

export interface AuditEvent {
  requestId: string; actorUserId?: string; actorRole?: UserRole; action: string; resourceType: string;
  resourceId?: string; clientId?: string; decision: 'ALLOW'|'DENY'|'SUCCESS'|'FAILURE'; reasonCode: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}
  async record(event: AuditEvent) {
    if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(event.reasonCode)) throw new Error('Audit reasonCode must be a controlled code');
    await this.prisma.$executeRaw`
      INSERT INTO audit_events (request_id, actor_user_id, actor_role, action, resource_type, resource_id, client_id, decision, reason_code)
      VALUES (${event.requestId}, ${event.actorUserId ?? null}::uuid, ${event.actorRole ?? null}::user_role, ${event.action}, ${event.resourceType},
        ${event.resourceId ?? null}::uuid, ${event.clientId ?? null}::uuid, ${event.decision}::audit_decision, ${event.reasonCode})
    `;
  }
}
