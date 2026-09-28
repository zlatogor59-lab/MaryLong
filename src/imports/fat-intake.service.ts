import {HttpStatus,Injectable} from '@nestjs/common';
import {createHash} from 'node:crypto';
import type {AuthenticatedUser} from '../auth/auth.types';
import {AuthorizationPolicy} from '../authorization/authorization.policy';
import {AppError,unavailable} from '../common/app-error';
import {AssignmentRepository} from './assignment.repository';
import {calculateFatIntake,type FatIntakeInput,type FatProductSnapshot} from './fat-intake.calculator';
import {calculateFatRecommendations} from './fat-recommendation.calculator';
import {calculateFatClientExplanation,isFatExplanationApprovalCurrent} from './fat-client-explanation.calculator';
import {NutrientClientPublicationRepository} from './nutrient-client-publication.repository';
import {FatTargetRepository} from './fat-target.repository';
import {FoodProductRepository} from './food-product.repository';
import {PayloadCryptoService} from './payload-crypto.service';
import {ProteinIntakeRepository} from './protein-intake.repository';
import {SubmissionStore} from './submission.store';

@Injectable()
export class FatIntakeService {
  constructor(private readonly store:SubmissionStore,private readonly assignments:AssignmentRepository,private readonly policy:AuthorizationPolicy,private readonly proteinIntake:ProteinIntakeRepository,private readonly products:FoodProductRepository,private readonly fatTarget:FatTargetRepository,private readonly crypto:PayloadCryptoService,private readonly approvals:NutrientClientPublicationRepository){}
  async get(submissionId:string,clientId:string,user:AuthenticatedUser){
    this.policy.requireRole(user,'consultant');
    const submission=await this.store.findById(submissionId);
    if(!submission||submission.clientId!==clientId)throw unavailable('SUBMISSION_NOT_FOUND');
    this.policy.requireActiveAssignment(user,await this.assignments.activeConsultant(clientId));
    if(submission.status!=='accepted')throw unavailable('SUBMISSION_NOT_ACCEPTED');
    const assessment=await this.proteinIntake.findBySubmission(submissionId),target=await this.fatTarget.findBySubmission(submissionId);
    if(!assessment)return {submission_id:submissionId,source_intake_version:0,summary:null};
    let payload:any;
    try{payload=JSON.parse(Buffer.from(await this.crypto.decrypt(assessment.payloadCiphertext)).toString('utf8'));}catch{throw new AppError('PROTEIN_INTAKE_INTEGRITY_FAILED',409);}
    const inputs:FatIntakeInput[]=payload.items||[],allCards=await this.products.listVerified(),selectedIds=new Set(inputs.map(i=>i.productCardId)),cards=new Map(allCards.filter(p=>selectedIds.has(p.id)).map(p=>[p.id,p]));
    const keys=['carbohydratePer100g','fibrePer100g','totalSugarsPer100g','freeSugarsPer100g','totalFatPer100g','saturatedFatPer100g','monounsaturatedFatPer100g','polyunsaturatedFatPer100g','transFatPer100g','omega6TotalPer100g','omega3TotalPer100g','omega6LaPer100g','omega3AlaPer100g','epaPer100g','dhaPer100g','palmiticAcidPer100g'] as const;
    const fatCards=new Map<string,FatProductSnapshot>([...cards].map(([id,p])=>[id,{...p,...Object.fromEntries(keys.map(k=>[k,p[k]??null]))} as FatProductSnapshot]));
    const c=calculateFatIntake(inputs,fatCards,target?.energyKcal??null,target?.targetMinG??null,target?.targetMaxG??null);
    const recommendations=calculateFatRecommendations(c,allCards);
    const clientExplanation=calculateFatClientExplanation(c);
    const explanationHash=createHash('sha256').update(JSON.stringify(clientExplanation)).digest('hex'),approval=await this.approvals.find(submissionId,'fat'),approvalCurrent=isFatExplanationApprovalCurrent(approval,assessment.version,target?.version??0,explanationHash);
    return {submission_id:submissionId,source_intake_version:assessment.version,target_version:target?.version??0,client_explanation:clientExplanation,client_approval:{status:approvalCurrent?'approved':'draft',version:approval?.version??0,approved_at:approvalCurrent?approval?.approvedAt.toISOString():null},professional_recommendations:recommendations,summary:{fat_balance:{status:c.fatBalance.status,target_min_g:c.fatBalance.targetMinG,target_max_g:c.fatBalance.targetMaxG,difference_g:c.fatBalance.differenceG,difference_percent:c.fatBalance.differencePercent},total_fat_g:c.totals.totalFatPer100g,total_carbohydrate_g:c.totals.carbohydratePer100g,carbohydrate_energy_percent:c.carbohydrateEnergyPercent,fibre_g:c.totals.fibrePer100g,total_sugars_g:c.totals.totalSugarsPer100g,free_sugars_g:c.completeness.freeSugarsPer100g===100?c.totals.freeSugarsPer100g:null,free_sugars_energy_percent:c.freeSugarsEnergyPercent,preferred_carbohydrate_share_percent:c.preferredCarbohydrateSharePercent,saturated_fat_g:c.totals.saturatedFatPer100g,monounsaturated_fat_g:c.totals.monounsaturatedFatPer100g,polyunsaturated_fat_g:c.totals.polyunsaturatedFatPer100g,trans_fat_g:c.totals.transFatPer100g,omega6_la_g:c.totals.omega6LaPer100g,omega3_ala_g:c.totals.omega3AlaPer100g,epa_dha_mg:c.epaDhaMg,palmitic_acid_g:c.totals.palmiticAcidPer100g,saturated_energy_percent:c.sfaEnergyPercent,trans_energy_percent:c.transEnergyPercent,omega6_la_energy_percent:c.laEnergyPercent,omega3_ala_energy_percent:c.alaEnergyPercent,omega6_to_omega3_ratio:c.omega6ToOmega3Ratio,palmitic_share_percent:c.palmiticSharePercent,signals:c.signals,completeness:c.completeness},lines:c.lines,unresolved:c.unresolved};
  }
  async approveClientExplanation(submissionId:string,clientId:string,user:AuthenticatedUser,requestId:string,expectedVersion:number){const current=await this.get(submissionId,clientId,user);if(!current.client_explanation||current.source_intake_version<1)throw new AppError('FAT_CLIENT_EXPLANATION_UNAVAILABLE',HttpStatus.CONFLICT);const serialized=JSON.stringify(current.client_explanation),explanationHash=createHash('sha256').update(serialized).digest('hex'),explanationCiphertext=await this.crypto.encrypt(Buffer.from(serialized)),saved=await this.approvals.approve({clientId,submissionId,nutrientKey:'fat',sourceIntakeVersion:current.source_intake_version,targetVersion:current.target_version,explanationHash,explanationCiphertext,approvedBy:user.id,expectedVersion,requestId});if(!saved)throw new AppError('FAT_CLIENT_EXPLANATION_VERSION_CONFLICT',HttpStatus.CONFLICT);return {status:'approved',version:saved.version,approved_at:saved.approvedAt.toISOString()};}
}
