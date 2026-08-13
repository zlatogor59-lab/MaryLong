import { Body, Controller, Get, Headers, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { SubmissionWorkflowService } from './submission-workflow.service';
import { AppError } from '../common/app-error';

@Controller('submissions/:submissionId')
export class SubmissionWorkflowController {
  constructor(private readonly workflow: SubmissionWorkflowService) {}
  @Get('preview') preview(@Param('submissionId') id:string, @CurrentUser() user:AuthenticatedUser) { return this.workflow.preview(id,user); }
  @Post('accept') accept(@Param('submissionId') id:string, @Headers('idempotency-key') key:string|undefined,
    @Headers('x-request-id') requestId:string, @CurrentUser() user:AuthenticatedUser) {
    requireIdempotencyKey(key); return this.workflow.accept(id,user,requestId);
  }
  @Post('reject') reject(@Param('submissionId') id:string, @Headers('idempotency-key') key:string|undefined,
    @Headers('x-request-id') requestId:string, @Body() body:{reason_code:string}, @CurrentUser() user:AuthenticatedUser) {
    requireIdempotencyKey(key);
    return this.workflow.reject(id,user,body.reason_code,requestId);
  }
}

function requireIdempotencyKey(key:string|undefined) {
  if (!key?.trim()) throw new AppError('IDEMPOTENCY_KEY_REQUIRED',HttpStatus.UNPROCESSABLE_ENTITY);
}
