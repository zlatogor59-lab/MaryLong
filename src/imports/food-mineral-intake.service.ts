import {Injectable} from '@nestjs/common';
import type {AuthenticatedUser} from '../auth/auth.types';
import {AuthorizationPolicy} from '../authorization/authorization.policy';
import {AppError,unavailable} from '../common/app-error';
import {AssignmentRepository} from './assignment.repository';
import {calculateFoodMineralIntake,type FoodMineralKey,type MineralUnit} from './food-mineral-intake.calculator';
import {FoodProductRepository} from './food-product.repository';
import {PayloadCryptoService} from './payload-crypto.service';
import {ProteinIntakeRepository} from './protein-intake.repository';
import {SubmissionStore} from './submission.store';

@Injectable()
export class FoodMineralIntakeService {
  constructor(private readonly store:SubmissionStore,private readonly assignments:AssignmentRepository,private readonly policy:AuthorizationPolicy,private readonly intake:ProteinIntakeRepository,private readonly products:FoodProductRepository,private readonly crypto:PayloadCryptoService){}
  private async requireSubmission(submissionId:string,clientId:string,user:AuthenticatedUser){this.policy.requireRole(user,'consultant');const submission=await this.store.findById(submissionId);if(!submission||submission.clientId!==clientId)throw unavailable('SUBMISSION_NOT_FOUND');this.policy.requireActiveAssignment(user,await this.assignments.activeConsultant(clientId));if(submission.status!=='accepted')throw unavailable('SUBMISSION_NOT_ACCEPTED');}
  async get(submissionId:string,clientId:string,user:AuthenticatedUser,nutrient:FoodMineralKey,targetValue:number|null,targetUnit:MineralUnit){
    await this.requireSubmission(submissionId,clientId,user);const assessment=await this.intake.findBySubmission(submissionId);if(!assessment)return{submission_id:submissionId,source_intake_version:0,assessment:null};
    let payload:{items?:Array<{productCardId:string;massG:number}>};try{payload=JSON.parse(Buffer.from(await this.crypto.decrypt(assessment.payloadCiphertext)).toString('utf8'));}catch{throw new AppError('PROTEIN_INTAKE_INTEGRITY_FAILED',409);}
    const inputs=payload.items??[],cards=await this.products.verifiedByIds([...new Set(inputs.map(item=>item.productCardId))]);
    const foodCards=[...cards.values()].map(card=>({foodKey:card.id,displayName:card.name,nutrients:card.mineralProfile}));
    const result=calculateFoodMineralIntake(nutrient,inputs.map(item=>({foodKey:item.productCardId,grossMassG:item.massG})),foodCards,{value:targetValue,unit:targetUnit});
    return{submission_id:submissionId,source_intake_version:assessment.version,assessment:result};
  }
}
