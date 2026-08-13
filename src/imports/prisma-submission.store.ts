import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SubmissionStore, type SubmissionRecord } from './submission.store';

type Row = { id:string; client_id:string; source_response_id:string|null; idempotency_key:string; schema_id:SubmissionRecord['schemaId']; header_fingerprint:string;
  payload_hash:string; payload_ciphertext:Uint8Array; import_status:'received'|'verified'|'blocked'|'accepted'; block_code:string|null; consent_status:'verified'|'not_verified' };
const map = (r: Row): SubmissionRecord => ({ id:r.id, clientId:r.client_id, sourceResponseId:r.source_response_id ?? undefined, idempotencyKey:r.idempotency_key,
  schemaId:r.schema_id, headerFingerprint:r.header_fingerprint, payloadHash:r.payload_hash, payloadCiphertext:r.payload_ciphertext,
  status:r.import_status, blockCode:r.block_code ?? undefined, consentStatus:r.consent_status });

@Injectable()
export class PrismaSubmissionStore extends SubmissionStore {
  constructor(private readonly prisma: PrismaService) { super(); }
  async findByIdempotencyKey(key: string) {
    const rows = await this.prisma.$queryRaw<Row[]>`SELECT * FROM form_submissions WHERE idempotency_key=${key} LIMIT 1`;
    return rows[0] ? map(rows[0]) : null;
  }
  async findDuplicate(source: string | undefined, hash: string) {
    const rows = await this.prisma.$queryRaw<Row[]>`SELECT * FROM form_submissions
      WHERE payload_hash=${hash} OR (${source ?? null}::text IS NOT NULL AND source_response_id=${source ?? null}) LIMIT 1`;
    return rows[0] ? map(rows[0]) : null;
  }
  async findById(id: string) {
    const rows = await this.prisma.$queryRaw<Row[]>`SELECT * FROM form_submissions WHERE id=${id}::uuid LIMIT 1`;
    return rows[0] ? map(rows[0]) : null;
  }
  async create(r: SubmissionRecord, clientId: string) {
    const rows = await this.prisma.$queryRaw<Row[]>`INSERT INTO form_submissions
      (client_id,schema_id,source_type,source_response_id,header_fingerprint,payload_ciphertext,payload_hash,idempotency_key,import_status,block_code,consent_status)
      VALUES (${clientId}::uuid,${r.schemaId}::form_schema_id,'csv',${r.sourceResponseId ?? null},${r.headerFingerprint},
        ${Buffer.from(r.payloadCiphertext)},${r.payloadHash},${r.idempotencyKey},${r.status}::import_status,${r.blockCode ?? null},${r.consentStatus}::consent_status)
      RETURNING *`;
    return map(rows[0]);
  }
  async transition(id: string, fromStatus: SubmissionRecord['status'], toStatus: SubmissionRecord['status'], blockCode?: string) {
    const count = await this.prisma.$executeRaw`UPDATE form_submissions SET import_status=${toStatus}::import_status, block_code=${blockCode ?? null}
      WHERE id=${id}::uuid AND import_status=${fromStatus}::import_status`;
    return count === 1;
  }
  async transitionWithAudit(input:{id:string;fromStatus:SubmissionRecord['status'];toStatus:SubmissionRecord['status'];blockCode?:string;
    requestId:string;actorUserId:string;actorRole:'admin'|'consultant'|'client';clientId:string;action:string;reasonCode:string}) {
    return this.prisma.$transaction(async tx => {
      const count=await tx.$executeRaw`UPDATE form_submissions SET import_status=${input.toStatus}::import_status, block_code=${input.blockCode ?? null}
        WHERE id=${input.id}::uuid AND import_status=${input.fromStatus}::import_status`;
      if(count!==1)return false;
      await tx.$executeRaw`INSERT INTO audit_events (request_id,actor_user_id,actor_role,action,resource_type,resource_id,client_id,decision,reason_code)
        VALUES (${input.requestId},${input.actorUserId}::uuid,${input.actorRole}::user_role,${input.action},'form_submission',${input.id}::uuid,
          ${input.clientId}::uuid,'SUCCESS',${input.reasonCode})`;
      return true;
    });
  }
}
