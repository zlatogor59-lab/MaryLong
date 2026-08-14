import { describe,expect,it } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { ConsultantNoteService } from './consultant-note.service';

const user:AuthenticatedUser={id:'00000000-0000-0000-0000-000000000001',authSubject:'synthetic',role:'consultant',status:'active',sessionIssuedAt:new Date(),sessionRevokedAt:null};
const clientId='00000000-0000-0000-0000-000000000099',submissionId='00000000-0000-0000-0000-000000000020';
const submission={id:submissionId,clientId,sourceResponseId:undefined,idempotencyKey:'k',schemaId:'forms_v2_76_columns' as const,headerFingerprint:'h',payloadHash:'h',payloadCiphertext:Buffer.alloc(1),status:'accepted' as const,blockCode:undefined,consentStatus:'verified' as const};

function setup(overrides:{assigned?:string|null;status?:string;existing?:boolean;save?:boolean}={}) {
  const events:unknown[]=[],savedInputs:unknown[]=[];
  const record={id:'00000000-0000-0000-0000-000000000030',clientId,submissionId,authorUserId:user.id,bodyCiphertext:Buffer.from('cipher'),version:2,updatedAt:new Date('2026-08-14T10:00:00Z')};
  const service=new ConsultantNoteService({findById:async()=>({...submission,status:overrides.status??'accepted'})} as never,
    {activeConsultant:async()=>overrides.assigned===undefined?user.id:overrides.assigned} as never,new AuthorizationPolicy(),
    {findBySubmission:async()=>overrides.existing===false?null:record,save:async(input:unknown)=>{savedInputs.push(input);return overrides.save===false?null:{...record,version:3};}} as never,
    {encrypt:async(value:Uint8Array)=>value,decrypt:async()=>Buffer.from('Внутренняя заметка')} as never,
    {record:async(event:unknown)=>events.push(event)} as never);
  return {service,events,savedInputs};
}

describe('consultant note',()=>{
  it('returns decrypted current note and audits read without note body',async()=>{const {service,events}=setup();const result=await service.get(submissionId,clientId,user,'req');expect(result.body).toBe('Внутренняя заметка');expect(JSON.stringify(events)).not.toContain(result.body);});
  it('returns version zero when a note does not exist',async()=>expect((await setup({existing:false}).service.get(submissionId,clientId,user,'req')).version).toBe(0));
  it('denies access without an active assignment',async()=>await expect(setup({assigned:null}).service.get(submissionId,clientId,user,'req')).rejects.toThrow('RESOURCE_UNAVAILABLE'));
  it('denies notes for a non-accepted submission',async()=>await expect(setup({status:'verified'}).service.get(submissionId,clientId,user,'req')).rejects.toThrow('RESOURCE_UNAVAILABLE'));
  it('saves encrypted normalized text with expected version',async()=>{const {service,savedInputs}=setup();const result=await service.save(submissionId,clientId,user,'req',2,' текст\r\nзаметки ');expect(result.version).toBe(3);expect(JSON.stringify(savedInputs)).not.toContain('текст');});
  it('reports an optimistic concurrency conflict',async()=>await expect(setup({save:false}).service.save(submissionId,clientId,user,'req',2,'draft')).rejects.toThrow('CONSULTANT_NOTE_VERSION_CONFLICT'));
  it('rejects oversized text',async()=>await expect(setup().service.save(submissionId,clientId,user,'req',2,'x'.repeat(20001))).rejects.toThrow('CONSULTANT_NOTE_INVALID'));
});
