import { createHash } from 'node:crypto';
import { describe,expect,it } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { SubmissionAnalysisService } from './submission-analysis.service';

const user:AuthenticatedUser={id:'00000000-0000-0000-0000-000000000001',authSubject:'synthetic',role:'consultant',status:'active',sessionIssuedAt:new Date(),sessionRevokedAt:null};
const clientId='00000000-0000-0000-0000-000000000099';
const values=Array(76).fill('');
values[1]='Скрытое имя';values[2]='0000000000';values[3]='170';values[13]='Улучшить рацион';values[28]='Синтетический обед';values[46]='secret_telegram';values[60]='Нет';values[70]='private-file';
const plaintext=Buffer.from(JSON.stringify(values));
const record={id:'00000000-0000-0000-0000-000000000020',clientId,sourceResponseId:undefined,idempotencyKey:'k',schemaId:'forms_v2_76_columns' as const,
  headerFingerprint:'h',payloadHash:createHash('sha256').update(plaintext).digest('hex'),payloadCiphertext:plaintext,status:'accepted' as const,blockCode:undefined,consentStatus:'verified' as const};

function service(overrides:{status?:string;assigned?:string|null;hash?:string}={}) {
  const events:unknown[]=[];
  const current={...record,status:(overrides.status??record.status),payloadHash:overrides.hash??record.payloadHash};
  const instance=new SubmissionAnalysisService({findById:async()=>current} as never,{activeConsultant:async()=>overrides.assigned===undefined?user.id:overrides.assigned} as never,
    new AuthorizationPolicy(),{decrypt:async()=>plaintext} as never,{record:async (event:unknown)=>{events.push(event);}} as never);
  return {instance,events};
}

describe('submission analysis',()=>{
  it('returns allowlisted normalized fields and audits access',async()=>{
    const {instance,events}=service();const result=await instance.get(record.id,clientId,user,'req_analysis');
    expect(result.sections.flatMap(x=>x.fields).map(x=>x.key)).toContain('main_goal');
    expect(JSON.stringify(result)).not.toContain('Скрытое имя');
    expect(JSON.stringify(result)).not.toContain('secret_telegram');
    expect(JSON.stringify(result)).not.toContain('private-file');
    expect(events).toHaveLength(1);
  });
  it('hides a non-accepted submission',async()=>await expect(service({status:'verified'}).instance.get(record.id,clientId,user,'req')).rejects.toThrow('RESOURCE_UNAVAILABLE'));
  it('denies a consultant without active assignment',async()=>await expect(service({assigned:null}).instance.get(record.id,clientId,user,'req')).rejects.toThrow('RESOURCE_UNAVAILABLE'));
  it('rejects a payload with a changed hash',async()=>await expect(service({hash:'bad'}).instance.get(record.id,clientId,user,'req')).rejects.toThrow('PAYLOAD_INTEGRITY_FAILED'));
});
