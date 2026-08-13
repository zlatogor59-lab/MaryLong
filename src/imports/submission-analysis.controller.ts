import { Controller, Get, Headers, Param } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SubmissionAnalysisService } from './submission-analysis.service';

@Controller('clients/:clientId/submissions/:submissionId/analysis')
export class SubmissionAnalysisController {
  constructor(private readonly analysis:SubmissionAnalysisService) {}
  @Get()
  get(@Param('clientId') clientId:string,@Param('submissionId') submissionId:string,@Headers('x-request-id') requestId:string,
    @CurrentUser() user:AuthenticatedUser) { return this.analysis.get(submissionId,clientId,user,requestId); }
}
