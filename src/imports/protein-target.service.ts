import { createHash } from 'node:crypto';
import { HttpStatus,Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { AppError,unavailable } from '../common/app-error';
import { AssignmentRepository } from './assignment.repository';
import { calculateProteinTarget,proteinRangeForFactor } from './protein-target.calculator';
import { ProteinTargetRepository,type ProteinTargetRecord,type ProteinTargetSource } from './protein-target.repository';
import { PayloadCryptoService } from './payload-crypto.service';
import { SubmissionStore,type SubmissionRecord } from './submission.store';

@Injectable()
export class ProteinTargetService {
  constructor(private readonly store:SubmissionStore,private readonly assignments:AssignmentRepository,private readonly policy:AuthorizationPolicy,private readonly targets:ProteinTargetRepository,private readonly crypto:PayloadCryptoService){}
  private async requireSubmission(submissionId:string,clientId:string,user:AuthenticatedUser){this.policy.requireRole(user,'consultant');const s=await this.store.findById(submissionId);if(!s||s.clientId!==clientId)throw unavailable('SUBMISSION_NOT_FOUND');this.policy.requireActiveAssignment(user,await this.assignments.activeConsultant(clientId));if(s.status!=='accepted')throw unavailable('SUBMISSION_NOT_ACCEPTED');return s;}
  async get(submissionId:string,clientId:string,user:AuthenticatedUser){await this.requireSubmission(submissionId,clientId,user);const target=await this.targets.findBySubmission(submissionId);if(!target)return {submission_id:submissionId,source:null,bmi_exact:null,bmi_rounded:null,protein_factor_g:null,target_min_g:null,target_max_g:null,reason:'',version:0,updated_at:null};return this.dto(target,await this.decryptReason(target));}
  async save(submissionId:string,clientId:string,user:AuthenticatedUser,requestId:string,expectedVersion:number,input:{source?:unknown;protein_factor_g?:unknown;target_min_g?:unknown;target_max_g?:unknown;reason?:unknown}){
    const submission=await this.requireSubmission(submissionId,clientId,user);const source=String(input.source) as ProteinTargetSource;if(!['built_in','physical_ruler','manual'].includes(source))throw this.invalid();
    if(typeof input.reason!=='string'||input.reason.length>1000)throw this.invalid();const reason=input.reason.replace(/\r\n/g,'\n').trim();
    let bmiExact:number|null=null,bmiRounded:number|null=null,proteinFactorG:number,targetMinG:number,targetMaxG:number;
    if(source==='built_in'){
      const values=await this.payload(submission);const calculation=calculateProteinTarget(String(values[50]??''),this.number(values[3]),this.number(values[4]));
      if(!calculation||calculation.proteinFactorG>175)throw new AppError('PROTEIN_TARGET_MANUAL_REQUIRED',HttpStatus.UNPROCESSABLE_ENTITY);
      ({bmiExact,bmiRounded,proteinFactorG,targetMinG,targetMaxG}=calculation);
    }else{
      proteinFactorG=this.integer(input.protein_factor_g);targetMinG=this.integer(input.target_min_g);targetMaxG=this.integer(input.target_max_g);
      if(proteinFactorG<20||proteinFactorG>300||targetMinG<20||targetMaxG>300||targetMinG>targetMaxG)throw this.invalid();
      if(source==='physical_ruler'){const range=proteinRangeForFactor(proteinFactorG);if(!range)throw new AppError('PROTEIN_TARGET_MANUAL_REQUIRED',HttpStatus.UNPROCESSABLE_ENTITY);({targetMinG,targetMaxG}=range);}
    }
    const saved=await this.targets.save({clientId,submissionId,updatedBy:user.id,source,bmiExact,bmiRounded,proteinFactorG,targetMinG,targetMaxG,reasonCiphertext:await this.crypto.encrypt(Buffer.from(reason,'utf8')),expectedVersion,requestId});
    if(!saved)throw new AppError('PROTEIN_TARGET_VERSION_CONFLICT',HttpStatus.CONFLICT);return this.dto(saved,reason);
  }
  private async payload(s:SubmissionRecord){let plaintext:Uint8Array;try{plaintext=await this.crypto.decrypt(s.payloadCiphertext);}catch{throw new AppError('PAYLOAD_INTEGRITY_FAILED',HttpStatus.CONFLICT);}if(createHash('sha256').update(plaintext).digest('hex')!==s.payloadHash)throw new AppError('PAYLOAD_INTEGRITY_FAILED',HttpStatus.CONFLICT);let values:unknown;try{values=JSON.parse(Buffer.from(plaintext).toString('utf8'));}catch{throw new AppError('PAYLOAD_INVALID',HttpStatus.CONFLICT);}if(!Array.isArray(values))throw new AppError('PAYLOAD_INVALID',HttpStatus.CONFLICT);return values;}
  private number(value:unknown){const parsed=Number(String(value??'').replace(',','.'));return Number.isFinite(parsed)?parsed:Number.NaN;}
  private integer(value:unknown){const parsed=Number(value);return Number.isInteger(parsed)?parsed:Number.NaN;}
  private invalid(){return new AppError('PROTEIN_TARGET_INVALID',HttpStatus.BAD_REQUEST);}
  private dto(t:ProteinTargetRecord,reason:string){return {submission_id:t.submissionId,source:t.source,bmi_exact:t.bmiExact===null?null:Number(t.bmiExact.toFixed(2)),bmi_rounded:t.bmiRounded,protein_factor_g:t.proteinFactorG,target_min_g:t.targetMinG,target_max_g:t.targetMaxG,reason,version:t.version,updated_at:t.updatedAt.toISOString()};}
  private async decryptReason(t:ProteinTargetRecord){try{return Buffer.from(await this.crypto.decrypt(t.reasonCiphertext)).toString('utf8');}catch{throw new AppError('PROTEIN_TARGET_INTEGRITY_FAILED',HttpStatus.CONFLICT);}}
}
