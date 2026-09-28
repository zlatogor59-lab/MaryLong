import {Injectable} from '@nestjs/common';
import type {AuthenticatedUser} from '../auth/auth.types';
import {AuthorizationPolicy} from '../authorization/authorization.policy';
import {AppError,unavailable} from '../common/app-error';
import {AssignmentRepository} from './assignment.repository';
import {MineralTargetSettingsRepository,type MineralTargets} from './mineral-target-settings.repository';
import {SubmissionStore} from './submission.store';

@Injectable()
export class MineralTargetSettingsService{
  constructor(private readonly store:SubmissionStore,private readonly assignments:AssignmentRepository,private readonly policy:AuthorizationPolicy,private readonly targets:MineralTargetSettingsRepository){}
  private async requireAccess(submissionId:string,clientId:string,user:AuthenticatedUser){this.policy.requireRole(user,'consultant');const submission=await this.store.findById(submissionId);if(!submission||submission.clientId!==clientId)throw unavailable('SUBMISSION_NOT_FOUND');this.policy.requireActiveAssignment(user,await this.assignments.activeConsultant(clientId));if(submission.status!=='accepted')throw unavailable('SUBMISSION_NOT_ACCEPTED');}
  async get(submissionId:string,clientId:string,user:AuthenticatedUser){await this.requireAccess(submissionId,clientId,user);return (await this.targets.get(clientId))??{magnesiumTargetMg:null,ironTargetMg:null,zincTargetMg:null,copperTargetUg:null,manganeseTargetMg:null,molybdenumTargetUg:null,seleniumTargetUg:null,seleniumUpperLevelUg:null,iodineTargetUg:null,iodineUpperLevelUg:null,version:0};}
  async save(submissionId:string,clientId:string,user:AuthenticatedUser,requestId:string,expectedVersion:number,values:Omit<MineralTargets,'version'>){await this.requireAccess(submissionId,clientId,user);const saved=await this.targets.save({...values,clientId,updatedBy:user.id,expectedVersion,requestId});if(!saved)throw new AppError('MINERAL_TARGETS_VERSION_CONFLICT',409);return saved;}
}
