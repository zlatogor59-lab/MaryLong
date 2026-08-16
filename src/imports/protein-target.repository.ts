import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type ProteinTargetSource='built_in'|'physical_ruler'|'manual';
export type ProteinTargetRecord={id:string;clientId:string;submissionId:string;updatedBy:string;source:ProteinTargetSource;bmiExact:number|null;bmiRounded:number|null;proteinFactorG:number;targetMinG:number;targetMaxG:number;reasonCiphertext:Uint8Array;version:number;updatedAt:Date};
type Row={id:string;client_id:string;submission_id:string;updated_by:string;source:ProteinTargetSource;bmi_exact:unknown;bmi_rounded:number|null;protein_factor_g:number;target_min_g:number;target_max_g:number;reason_ciphertext:Uint8Array;version:number;updated_at:Date};
const map=(r:Row):ProteinTargetRecord=>({id:r.id,clientId:r.client_id,submissionId:r.submission_id,updatedBy:r.updated_by,source:r.source,bmiExact:r.bmi_exact===null?null:Number(r.bmi_exact),bmiRounded:r.bmi_rounded,proteinFactorG:r.protein_factor_g,targetMinG:r.target_min_g,targetMaxG:r.target_max_g,reasonCiphertext:r.reason_ciphertext,version:r.version,updatedAt:r.updated_at});

@Injectable()
export class ProteinTargetRepository {
  constructor(private readonly prisma:PrismaService){}
  async findBySubmission(submissionId:string){const rows=await this.prisma.$queryRaw<Row[]>`SELECT id,client_id,submission_id,updated_by,source::text,bmi_exact,bmi_rounded,protein_factor_g,target_min_g,target_max_g,reason_ciphertext,version,updated_at FROM protein_targets WHERE submission_id=${submissionId}::uuid LIMIT 1`;return rows[0]?map(rows[0]):null;}
  async save(input:{clientId:string;submissionId:string;updatedBy:string;source:ProteinTargetSource;bmiExact:number|null;bmiRounded:number|null;proteinFactorG:number;targetMinG:number;targetMaxG:number;reasonCiphertext:Uint8Array;expectedVersion:number;requestId:string}){
    return this.prisma.$transaction(async tx=>{let rows:Row[];
      if(input.expectedVersion===0)rows=await tx.$queryRaw<Row[]>`INSERT INTO protein_targets(client_id,submission_id,updated_by,source,bmi_exact,bmi_rounded,protein_factor_g,target_min_g,target_max_g,reason_ciphertext,version) VALUES(${input.clientId}::uuid,${input.submissionId}::uuid,${input.updatedBy}::uuid,${input.source}::protein_target_source,${input.bmiExact},${input.bmiRounded},${input.proteinFactorG},${input.targetMinG},${input.targetMaxG},${Buffer.from(input.reasonCiphertext)},1) ON CONFLICT(submission_id) DO NOTHING RETURNING id,client_id,submission_id,updated_by,source::text,bmi_exact,bmi_rounded,protein_factor_g,target_min_g,target_max_g,reason_ciphertext,version,updated_at`;
      else rows=await tx.$queryRaw<Row[]>`UPDATE protein_targets SET updated_by=${input.updatedBy}::uuid,source=${input.source}::protein_target_source,bmi_exact=${input.bmiExact},bmi_rounded=${input.bmiRounded},protein_factor_g=${input.proteinFactorG},target_min_g=${input.targetMinG},target_max_g=${input.targetMaxG},reason_ciphertext=${Buffer.from(input.reasonCiphertext)},version=version+1,updated_at=now() WHERE submission_id=${input.submissionId}::uuid AND version=${input.expectedVersion} RETURNING id,client_id,submission_id,updated_by,source::text,bmi_exact,bmi_rounded,protein_factor_g,target_min_g,target_max_g,reason_ciphertext,version,updated_at`;
      if(!rows[0])return null;const target=map(rows[0]);
      await tx.$executeRaw`INSERT INTO protein_target_versions(target_id,client_id,submission_id,updated_by,source,bmi_exact,bmi_rounded,protein_factor_g,target_min_g,target_max_g,reason_ciphertext,version) VALUES(${target.id}::uuid,${target.clientId}::uuid,${target.submissionId}::uuid,${target.updatedBy}::uuid,${target.source}::protein_target_source,${target.bmiExact},${target.bmiRounded},${target.proteinFactorG},${target.targetMinG},${target.targetMaxG},${Buffer.from(target.reasonCiphertext)},${target.version})`;
      await tx.$executeRaw`INSERT INTO audit_events(request_id,actor_user_id,actor_role,action,resource_type,resource_id,client_id,decision,reason_code) VALUES(${input.requestId},${input.updatedBy}::uuid,'consultant','protein_target.save','protein_target',${target.id}::uuid,${target.clientId}::uuid,'SUCCESS','PROTEIN_TARGET_SAVED')`;
      return target;},{maxWait:5_000});
  }
}
