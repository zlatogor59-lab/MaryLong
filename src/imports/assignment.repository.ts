import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class AssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}
  async activeConsultant(clientId: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{consultant_user_id:string}[]>`SELECT consultant_user_id FROM consultant_client_assignments
      WHERE client_id=${clientId}::uuid AND status='active' LIMIT 1`;
    return rows[0]?.consultant_user_id ?? null;
  }
}
