import {HttpStatus,Injectable} from '@nestjs/common';
import {createHash} from 'node:crypto';
import type {AuthenticatedUser} from '../auth/auth.types';
import {AppError} from '../common/app-error';
import {FoodMineralIntakeService} from './food-mineral-intake.service';
import {calculateMineralClientExplanation,isMineralExplanationApprovalCurrent} from './mineral-client-explanation.calculator';
import {MineralTargetSettingsService} from './mineral-target-settings.service';
import {NutrientClientPublicationRepository} from './nutrient-client-publication.repository';
import {PayloadCryptoService} from './payload-crypto.service';
import {RegionalNutrientService} from './regional-nutrient.service';
import {RegionalNutrientSettingsRepository} from './regional-nutrient-settings.repository';

@Injectable()
export class MineralClientExplanationService{
  constructor(private readonly food:FoodMineralIntakeService,private readonly regional:RegionalNutrientService,private readonly targets:MineralTargetSettingsService,private readonly settings:RegionalNutrientSettingsRepository,private readonly approvals:NutrientClientPublicationRepository,private readonly crypto:PayloadCryptoService){}
  async get(submissionId:string,clientId:string,user:AuthenticatedUser){
    const [target,regionalSettings]=await Promise.all([this.targets.get(submissionId,clientId,user),this.settings.get(clientId,submissionId)]),contextVersion=target.version*1_000_000+(regionalSettings.client?.version??0)*1_000+(regionalSettings.submission?.version??0),foodKeys=[['magnesium',target.magnesiumTargetMg,'mg'],['iron',target.ironTargetMg,'mg'],['zinc',target.zincTargetMg,'mg'],['copper',target.copperTargetUg,'ug'],['manganese',target.manganeseTargetMg,'mg'],['molybdenum',target.molybdenumTargetUg,'ug']] as const;
    const [magnesium,iron,zinc,copper,manganese,molybdenum,selenium,iodine]=await Promise.all([...foodKeys.map(([key,value,unit])=>this.food.get(submissionId,clientId,user,key,value,unit)),this.regional.get(submissionId,clientId,user,{nutrient:'selenium',marketCountry:null,targetUg:target.seleniumTargetUg,upperLevelUg:target.seleniumUpperLevelUg,period:'single_day'}),this.regional.get(submissionId,clientId,user,{nutrient:'iodine',marketCountry:null,targetUg:target.iodineTargetUg,upperLevelUg:target.iodineUpperLevelUg,period:'single_day'})]);
    const sourceIntakeVersion=Math.max(magnesium.source_intake_version,iron.source_intake_version,zinc.source_intake_version,copper.source_intake_version,manganese.source_intake_version,molybdenum.source_intake_version,selenium.source_intake_version,iodine.source_intake_version),assessments={magnesium:magnesium.assessment,iron:iron.assessment,zinc:zinc.assessment,copper:copper.assessment,manganese:manganese.assessment,molybdenum:molybdenum.assessment,selenium:selenium.assessment,iodine:iodine.assessment},explanation=calculateMineralClientExplanation(assessments),hash=createHash('sha256').update(JSON.stringify(explanation)).digest('hex'),approval=await this.approvals.find(submissionId,'minerals'),current=isMineralExplanationApprovalCurrent(approval,sourceIntakeVersion,contextVersion,hash);
    return{submission_id:submissionId,source_intake_version:sourceIntakeVersion,target_version:contextVersion,client_publication_status:current?'approved':'draft',client_explanation:explanation,client_approval:{status:current?'approved':'draft',version:approval?.version??0,approved_at:current?approval?.approvedAt.toISOString():null}};
  }
  async approve(submissionId:string,clientId:string,user:AuthenticatedUser,requestId:string,expectedVersion:number){const current=await this.get(submissionId,clientId,user);if(current.source_intake_version<1)throw new AppError('MINERAL_CLIENT_EXPLANATION_UNAVAILABLE',HttpStatus.CONFLICT);const serialized=JSON.stringify(current.client_explanation),hash=createHash('sha256').update(serialized).digest('hex'),ciphertext=await this.crypto.encrypt(Buffer.from(serialized)),saved=await this.approvals.approve({clientId,submissionId,nutrientKey:'minerals',sourceIntakeVersion:current.source_intake_version,targetVersion:current.target_version,explanationHash:hash,explanationCiphertext:ciphertext,approvedBy:user.id,expectedVersion,requestId});if(!saved)throw new AppError('MINERAL_CLIENT_EXPLANATION_VERSION_CONFLICT',HttpStatus.CONFLICT);return{status:'approved',version:saved.version,approved_at:saved.approvedAt.toISOString()};}
}
