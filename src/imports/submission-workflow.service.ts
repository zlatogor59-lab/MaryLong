import { HttpStatus, Injectable } from '@nestjs/common';
import { AppError, unavailable } from '../common/app-error';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { AssignmentRepository } from './assignment.repository';
import { SubmissionStore, type SubmissionRecord } from './submission.store';

const safeDto = (r: SubmissionRecord) => ({ submission_id:r.id, schema_id:r.schemaId, status:r.status,
  block_code:r.blockCode ?? null, consent_status:r.consentStatus, source_response_id:r.sourceResponseId ?? null });

@Injectable()
export class SubmissionWorkflowService {
  constructor(private readonly store: SubmissionStore, private readonly assignments: AssignmentRepository,
    private readonly policy: AuthorizationPolicy) {}

  private async scoped(id: string, user: AuthenticatedUser) {
    const record = await this.store.findById(id);
    if (!record) throw unavailable('SUBMISSION_NOT_FOUND');
    this.policy.requireActiveAssignment(user, await this.assignments.activeConsultant(record.clientId));
    return record;
  }

  async preview(id: string, user: AuthenticatedUser) { return safeDto(await this.scoped(id, user)); }

  async accept(id: string, user: AuthenticatedUser, requestId = 'req_test') {
    const record = await this.scoped(id, user);
    if (record.status === 'accepted') return safeDto(record);
    if (record.status !== 'verified' || record.consentStatus !== 'verified' || record.blockCode) {
      throw new AppError('STATE_CONFLICT', HttpStatus.CONFLICT, 'SUBMISSION_NOT_VERIFIED');
    }
    if (!await this.store.transitionWithAudit({id,fromStatus:'verified',toStatus:'accepted',requestId,actorUserId:user.id,actorRole:user.role,
      clientId:record.clientId,action:'submission.accept',reasonCode:'SUBMISSION_ACCEPTED'})) throw new AppError('STATE_CONFLICT', HttpStatus.CONFLICT, 'SUBMISSION_CHANGED');
    return safeDto({ ...record, status:'accepted' });
  }

  async reject(id: string, user: AuthenticatedUser, reasonCode: string, requestId = 'req_test') {
    if (!/^[A-Z][A-Z0-9_]{1,63}$/.test(reasonCode)) throw new AppError('REASON_CODE_INVALID', HttpStatus.UNPROCESSABLE_ENTITY);
    const record = await this.scoped(id, user);
    if (record.status === 'accepted') throw new AppError('STATE_CONFLICT', HttpStatus.CONFLICT, 'SUBMISSION_ALREADY_ACCEPTED');
    if (record.status === 'blocked' && record.blockCode === reasonCode) return safeDto(record);
    if (!await this.store.transitionWithAudit({id,fromStatus:record.status,toStatus:'blocked',blockCode:reasonCode,requestId,actorUserId:user.id,
      actorRole:user.role,clientId:record.clientId,action:'submission.reject',reasonCode})) throw new AppError('STATE_CONFLICT', HttpStatus.CONFLICT, 'SUBMISSION_CHANGED');
    return safeDto({ ...record, status:'blocked', blockCode:reasonCode as SubmissionRecord['blockCode'] });
  }
}
