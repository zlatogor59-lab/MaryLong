import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface SubmissionHistoryItem {
  id:string; schemaId:string; status:string; consentStatus:string; blockCode:string|null; createdAt:Date;
}

@Injectable()
export class SubmissionHistoryRepository {
  constructor(private readonly prisma: PrismaService) {}
  async listForConsultant(clientId:string, consultantUserId:string, limit=20):Promise<SubmissionHistoryItem[]> {
    const safeLimit=Math.min(Math.max(limit,1),50);
    return this.prisma.$queryRaw<SubmissionHistoryItem[]>`SELECT s.id,s.schema_id::text AS "schemaId",s.import_status::text AS status,
      s.consent_status::text AS "consentStatus",s.block_code AS "blockCode",s.created_at AS "createdAt"
      FROM form_submissions s
      WHERE s.client_id=${clientId}::uuid AND EXISTS (SELECT 1 FROM consultant_client_assignments a
        WHERE a.client_id=s.client_id AND a.consultant_user_id=${consultantUserId}::uuid AND a.status='active')
      ORDER BY s.created_at DESC,s.id DESC LIMIT ${safeLimit}`;
  }
}
