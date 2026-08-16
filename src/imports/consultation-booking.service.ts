import { HttpStatus, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { AppError, unavailable } from '../common/app-error';
import { AssignmentRepository } from './assignment.repository';
import { ConsultationBookingRepository,type BookingRecord,type BookingStatus } from './consultation-booking.repository';
import { PayloadCryptoService } from './payload-crypto.service';
import { SubmissionStore } from './submission.store';

@Injectable()
export class ConsultationBookingService {
  constructor(private readonly store:SubmissionStore,private readonly assignments:AssignmentRepository,private readonly policy:AuthorizationPolicy,private readonly bookings:ConsultationBookingRepository,private readonly crypto:PayloadCryptoService){}
  private async requireSubmission(submissionId:string,clientId:string,user:AuthenticatedUser){this.policy.requireRole(user,'consultant');const s=await this.store.findById(submissionId);if(!s||s.clientId!==clientId)throw unavailable('SUBMISSION_NOT_FOUND');this.policy.requireActiveAssignment(user,await this.assignments.activeConsultant(clientId));if(s.status!=='accepted')throw unavailable('SUBMISSION_NOT_ACCEPTED');}
  async get(submissionId:string,clientId:string,user:AuthenticatedUser){await this.requireSubmission(submissionId,clientId,user);const b=await this.bookings.findBySubmission(submissionId);if(!b)return {submission_id:submissionId,status:'pending',scheduled_at:null,contact_note:'',version:0,updated_at:null};return this.dto(b,await this.decrypt(b));}
  async save(submissionId:string,clientId:string,user:AuthenticatedUser,requestId:string,expectedVersion:number,input:{status?:unknown;scheduled_at?:unknown;contact_note?:unknown}){await this.requireSubmission(submissionId,clientId,user);if(!['pending','scheduled','needs_reminder'].includes(String(input.status)))throw new AppError('CONSULTATION_BOOKING_INVALID',HttpStatus.BAD_REQUEST);if(typeof input.contact_note!=='string'||input.contact_note.length>2000)throw new AppError('CONSULTATION_BOOKING_INVALID',HttpStatus.BAD_REQUEST);const status=input.status as BookingStatus;let scheduledAt:Date|null=null;if(status==='scheduled'){if(typeof input.scheduled_at!=='string'||!input.scheduled_at.trim())throw new AppError('CONSULTATION_BOOKING_INVALID',HttpStatus.BAD_REQUEST);scheduledAt=new Date(input.scheduled_at);if(Number.isNaN(scheduledAt.getTime()))throw new AppError('CONSULTATION_BOOKING_INVALID',HttpStatus.BAD_REQUEST);}else if(input.scheduled_at!==null&&input.scheduled_at!==undefined&&input.scheduled_at!=='')throw new AppError('CONSULTATION_BOOKING_INVALID',HttpStatus.BAD_REQUEST);const contactNote=input.contact_note.replace(/\r\n/g,'\n').trim();const saved=await this.bookings.save({clientId,submissionId,updatedBy:user.id,status,scheduledAt,contactNoteCiphertext:await this.crypto.encrypt(Buffer.from(contactNote,'utf8')),expectedVersion,requestId});if(!saved)throw new AppError('CONSULTATION_BOOKING_VERSION_CONFLICT',HttpStatus.CONFLICT);return this.dto(saved,contactNote);}
  private dto(b:BookingRecord,note:string){return {submission_id:b.submissionId,status:b.status,scheduled_at:b.scheduledAt?.toISOString()??null,contact_note:note,version:b.version,updated_at:b.updatedAt.toISOString()};}
  private async decrypt(b:BookingRecord){try{return Buffer.from(await this.crypto.decrypt(b.contactNoteCiphertext)).toString('utf8');}catch{throw new AppError('CONSULTATION_BOOKING_INTEGRITY_FAILED',HttpStatus.CONFLICT);}}
}
