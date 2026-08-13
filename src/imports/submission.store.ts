import type { SchemaId } from './schema-registry';

export interface SubmissionRecord {
  id: string; clientId: string; sourceResponseId?: string; idempotencyKey: string; schemaId: SchemaId;
  headerFingerprint: string; payloadHash: string; payloadCiphertext: Uint8Array;
  status: 'received'|'verified'|'blocked'|'accepted'; blockCode?: string; consentStatus: 'verified'|'not_verified';
}

export abstract class SubmissionStore {
  abstract findByIdempotencyKey(key: string): Promise<SubmissionRecord | null>;
  abstract findDuplicate(sourceResponseId: string | undefined, payloadHash: string): Promise<SubmissionRecord | null>;
  abstract findById(id: string): Promise<SubmissionRecord | null>;
  abstract create(record: SubmissionRecord, clientId: string): Promise<SubmissionRecord>;
  abstract transition(id: string, fromStatus: SubmissionRecord['status'], toStatus: SubmissionRecord['status'], blockCode?: string): Promise<boolean>;
  abstract transitionWithAudit(input:{id:string;fromStatus:SubmissionRecord['status'];toStatus:SubmissionRecord['status'];blockCode?:string;
    requestId:string;actorUserId:string;actorRole:'admin'|'consultant'|'client';clientId:string;action:string;reasonCode:string}):Promise<boolean>;
  async updatePayload(): Promise<never> { throw new Error('SUBMISSION_IMMUTABLE'); }
}
