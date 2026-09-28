import {HttpStatus,Injectable} from '@nestjs/common';
import {createHash} from 'node:crypto';
import type {AuthenticatedUser} from '../auth/auth.types';
import {AppError} from '../common/app-error';
import {B12FolateIntakeService} from './b12-folate-intake.service';
import {calculateB12FolateClientExplanation,isB12FolateExplanationApprovalCurrent} from './b12-folate-client-explanation.calculator';
import {NutrientClientPublicationRepository} from './nutrient-client-publication.repository';
import {PayloadCryptoService} from './payload-crypto.service';

@Injectable()
export class B12FolateClientExplanationService{
  constructor(private readonly intake:B12FolateIntakeService,private readonly approvals:NutrientClientPublicationRepository,private readonly crypto:PayloadCryptoService){}
  async get(submissionId:string,clientId:string,user:AuthenticatedUser){
    const current=await this.intake.get(submissionId,clientId,user),assessments=current.assessments as any;
    if(!assessments)return{submission_id:submissionId,source_intake_version:0,client_publication_status:'draft',client_explanation:null,client_approval:{status:'draft',version:0,approved_at:null}};
    const explanation=calculateB12FolateClientExplanation(assessments),hash=createHash('sha256').update(JSON.stringify(explanation)).digest('hex'),approval=await this.approvals.find(submissionId,'b12_folate'),approved=isB12FolateExplanationApprovalCurrent(approval,current.source_intake_version,hash);
    return{submission_id:submissionId,source_intake_version:current.source_intake_version,client_publication_status:approved?'approved':'draft',client_explanation:explanation,client_approval:{status:approved?'approved':'draft',version:approval?.version??0,approved_at:approved?approval?.approvedAt.toISOString():null}};
  }
  async approve(submissionId:string,clientId:string,user:AuthenticatedUser,requestId:string,expectedVersion:number){
    const current=await this.get(submissionId,clientId,user);if(current.source_intake_version<1||!current.client_explanation)throw new AppError('B12_FOLATE_CLIENT_EXPLANATION_UNAVAILABLE',HttpStatus.CONFLICT);
    const serialized=JSON.stringify(current.client_explanation),hash=createHash('sha256').update(serialized).digest('hex'),ciphertext=await this.crypto.encrypt(Buffer.from(serialized)),saved=await this.approvals.approve({clientId,submissionId,nutrientKey:'b12_folate',sourceIntakeVersion:current.source_intake_version,targetVersion:0,explanationHash:hash,explanationCiphertext:ciphertext,approvedBy:user.id,expectedVersion,requestId});
    if(!saved)throw new AppError('B12_FOLATE_CLIENT_EXPLANATION_VERSION_CONFLICT',HttpStatus.CONFLICT);return{status:'approved',version:saved.version,approved_at:saved.approvedAt.toISOString()};
  }
}
