import {HttpStatus,Injectable} from '@nestjs/common';
import type {AuthenticatedUser} from '../auth/auth.types';
import {AuthorizationPolicy} from '../authorization/authorization.policy';
import {AppError,unavailable} from '../common/app-error';
import {AssignmentRepository} from './assignment.repository';
import {DailyRationSnapshotRepository,type DailyRationSnapshotRecord} from './daily-ration-snapshot.repository';
import {ProteinIntakeRepository} from './protein-intake.repository';
import {SubmissionStore} from './submission.store';

const ISO_DATE=/^\d{4}-\d{2}-\d{2}$/;
@Injectable()
export class DailyRationSnapshotService{
  constructor(private readonly store:SubmissionStore,private readonly assignments:AssignmentRepository,private readonly policy:AuthorizationPolicy,private readonly intake:ProteinIntakeRepository,private readonly snapshots:DailyRationSnapshotRepository){}
  private async requireSubmission(submissionId:string,clientId:string,user:AuthenticatedUser){this.policy.requireRole(user,'consultant');const submission=await this.store.findById(submissionId);if(!submission||submission.clientId!==clientId)throw unavailable('SUBMISSION_NOT_FOUND');this.policy.requireActiveAssignment(user,await this.assignments.activeConsultant(clientId));if(submission.status!=='accepted')throw unavailable('SUBMISSION_NOT_ACCEPTED');}
  async list(submissionId:string,clientId:string,user:AuthenticatedUser){await this.requireSubmission(submissionId,clientId,user);return{items:(await this.snapshots.list(submissionId)).map(this.dto)};}
  async capture(submissionId:string,clientId:string,user:AuthenticatedUser,requestId:string,rationDate:string){await this.requireSubmission(submissionId,clientId,user);const parsed=new Date(`${rationDate}T00:00:00Z`);if(!ISO_DATE.test(rationDate)||Number.isNaN(parsed.getTime())||parsed.toISOString().slice(0,10)!==rationDate)throw new AppError('RATION_DATE_INVALID',HttpStatus.BAD_REQUEST);const today=new Date().toISOString().slice(0,10);if(rationDate>today)throw new AppError('RATION_DATE_IN_FUTURE',HttpStatus.BAD_REQUEST);const assessment=await this.intake.findBySubmission(submissionId);if(!assessment)throw new AppError('RATION_INTAKE_REQUIRED',HttpStatus.CONFLICT);const saved=await this.snapshots.capture(assessment,rationDate,user.id,requestId);if(!saved)throw new AppError('RATION_SNAPSHOT_ALREADY_EXISTS',HttpStatus.CONFLICT);return this.dto(saved);}
  private dto(value:DailyRationSnapshotRecord){return{id:value.id,ration_date:value.rationDate,source_intake_version:value.intakeVersion,summary:{total_protein_g:value.totalProteinG,plant_protein_g:value.plantProteinG,animal_protein_g:value.animalProteinG,completeness_percent:value.completenessPercent},created_at:value.createdAt.toISOString()};}
}
