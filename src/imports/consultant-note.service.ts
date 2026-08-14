import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditService } from '../audit/audit.service';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { AppError, unavailable } from '../common/app-error';
import { AssignmentRepository } from './assignment.repository';
import { ConsultantNoteRepository, type ConsultantNoteRecord } from './consultant-note.repository';
import { PayloadCryptoService } from './payload-crypto.service';
import { SubmissionStore } from './submission.store';

@Injectable()
export class ConsultantNoteService {
  constructor(private readonly store:SubmissionStore,private readonly assignments:AssignmentRepository,private readonly policy:AuthorizationPolicy,
    private readonly notes:ConsultantNoteRepository,private readonly crypto:PayloadCryptoService,private readonly audit:AuditService) {}

  private async requireSubmission(submissionId:string,clientId:string,user:AuthenticatedUser) {
    this.policy.requireRole(user,'consultant');
    const submission=await this.store.findById(submissionId);
    if(!submission||submission.clientId!==clientId)throw unavailable('SUBMISSION_NOT_FOUND');
    this.policy.requireActiveAssignment(user,await this.assignments.activeConsultant(clientId));
    if(submission.status!=='accepted')throw unavailable('SUBMISSION_NOT_ACCEPTED');
    return submission;
  }

  async get(submissionId:string,clientId:string,user:AuthenticatedUser,requestId:string) {
    await this.requireSubmission(submissionId,clientId,user);
    const note=await this.notes.findBySubmission(submissionId);
    if(!note)return {submission_id:submissionId,body:'',version:0,updated_at:null};
    const body=await this.decrypt(note);
    await this.audit.record({requestId,actorUserId:user.id,actorRole:user.role,action:'consultant_note.read',resourceType:'consultant_note',resourceId:note.id,
      clientId,decision:'ALLOW',reasonCode:'CONSULTANT_NOTE_READ'});
    return {submission_id:submissionId,body,version:note.version,updated_at:note.updatedAt.toISOString()};
  }

  async save(submissionId:string,clientId:string,user:AuthenticatedUser,requestId:string,expectedVersion:number,body:unknown) {
    await this.requireSubmission(submissionId,clientId,user);
    if(typeof body!=='string'||body.length>20000)throw new AppError('CONSULTANT_NOTE_INVALID',HttpStatus.BAD_REQUEST);
    const normalized=body.replace(/\r\n/g,'\n').trim();
    const ciphertext=await this.crypto.encrypt(Buffer.from(normalized,'utf8'));
    const saved=await this.notes.save({clientId,submissionId,authorUserId:user.id,bodyCiphertext:ciphertext,expectedVersion,requestId});
    if(!saved)throw new AppError('CONSULTANT_NOTE_VERSION_CONFLICT',HttpStatus.CONFLICT);
    return {submission_id:submissionId,body:normalized,version:saved.version,updated_at:saved.updatedAt.toISOString()};
  }

  private async decrypt(note:ConsultantNoteRecord) {
    try{return Buffer.from(await this.crypto.decrypt(note.bodyCiphertext)).toString('utf8');}
    catch{throw new AppError('CONSULTANT_NOTE_INTEGRITY_FAILED',HttpStatus.CONFLICT);}
  }
}
