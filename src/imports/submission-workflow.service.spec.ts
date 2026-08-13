import { beforeEach, describe, expect, it } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { SubmissionWorkflowService } from './submission-workflow.service';
import { SubmissionStore, type SubmissionRecord } from './submission.store';

class Store extends SubmissionStore {
  record:SubmissionRecord|null=null;
  findByIdempotencyKey=async()=>null; findDuplicate=async()=>null; findById=async()=>this.record;
  create=async(r:SubmissionRecord)=>r; updatePayload=async():Promise<never>=>{throw new Error('SUBMISSION_IMMUTABLE')};
  transition=async(id:string,from:SubmissionRecord['status'],to:SubmissionRecord['status'],block?:string)=>{
    if(!this.record||this.record.id!==id||this.record.status!==from)return false; this.record.status=to; this.record.blockCode=block; return true;
  };
  transitionWithAudit=async(input:{id:string;fromStatus:SubmissionRecord['status'];toStatus:SubmissionRecord['status'];blockCode?:string})=>
    this.transition(input.id,input.fromStatus,input.toStatus,input.blockCode);
}
const user:AuthenticatedUser={id:'00000000-0000-0000-0000-000000000001',authSubject:'s',role:'consultant',status:'active',sessionIssuedAt:new Date(),sessionRevokedAt:null};
const base=():SubmissionRecord=>({id:'00000000-0000-0000-0000-000000000020',clientId:'00000000-0000-0000-0000-000000000010',idempotencyKey:'i',schemaId:'forms_v2_76_columns',headerFingerprint:'h',payloadHash:'p',payloadCiphertext:new Uint8Array(),status:'verified',consentStatus:'verified'});

describe('submission workflow',()=>{
  let store:Store;let service:SubmissionWorkflowService;
  beforeEach(()=>{store=new Store();store.record=base();service=new SubmissionWorkflowService(store,{activeConsultant:async()=>user.id} as never,new AuthorizationPolicy());});
  it('returns only safe preview metadata',async()=>expect(await service.preview(base().id,user)).toEqual({submission_id:base().id,schema_id:'forms_v2_76_columns',status:'verified',block_code:null,consent_status:'verified',source_response_id:null}));
  it('accepts a verified submission and is repeat-safe',async()=>{expect((await service.accept(base().id,user)).status).toBe('accepted');expect((await service.accept(base().id,user)).status).toBe('accepted');});
  it('rejects blocked acceptance with STATE_CONFLICT',async()=>{store.record={...base(),status:'blocked',blockCode:'PRIVACY_NOT_VERIFIED',consentStatus:'not_verified'};await expect(service.accept(base().id,user)).rejects.toThrow('STATE_CONFLICT');});
  it('rejects with a controlled reason code',async()=>expect((await service.reject(base().id,user,'SOURCE_REJECTED')).block_code).toBe('SOURCE_REJECTED'));
  it('masks a foreign assignment as unavailable',async()=>{service=new SubmissionWorkflowService(store,{activeConsultant:async()=>null} as never,new AuthorizationPolicy());await expect(service.preview(base().id,user)).rejects.toThrow('RESOURCE_UNAVAILABLE');});
});
