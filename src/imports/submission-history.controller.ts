import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { SubmissionHistoryRepository } from './submission-history.repository';

@Controller('clients/:clientId/submissions')
export class SubmissionHistoryController {
  constructor(private readonly history:SubmissionHistoryRepository,private readonly policy:AuthorizationPolicy) {}
  @Get()
  async list(@Param('clientId') clientId:string,@Query('limit') rawLimit:string|undefined,@CurrentUser() user:AuthenticatedUser) {
    this.policy.requireRole(user,'consultant');
    const parsed=Number(rawLimit); const limit=Number.isInteger(parsed) ? parsed : 20;
    const rows=await this.history.listForConsultant(clientId,user.id,limit);
    return {items:rows.map(row=>({submission_id:row.id,schema_id:row.schemaId,status:row.status,consent_status:row.consentStatus,
      block_code:row.blockCode,created_at:row.createdAt.toISOString()}))};
  }
}
