import {describe,expect,it} from 'vitest';
import type {AuthenticatedUser} from '../auth/auth.types';
import {AuthorizationPolicy} from '../authorization/authorization.policy';
import {MineralTargetSettingsService} from './mineral-target-settings.service';

const user:AuthenticatedUser={id:'00000000-0000-0000-0000-000000000001',authSubject:'synthetic',role:'consultant',status:'active',sessionIssuedAt:new Date(),sessionRevokedAt:null};
const clientId='00000000-0000-0000-0000-000000000099',submissionId='00000000-0000-0000-0000-000000000020';
const submission={id:submissionId,clientId,status:'accepted' as const,schemaId:'forms_v2_76_columns' as const,sourceResponseId:undefined,idempotencyKey:'k',headerFingerprint:'h',payloadHash:'hash',payloadCiphertext:new Uint8Array(),consentStatus:'verified' as const};
const values={magnesiumTargetMg:320,ironTargetMg:18,zincTargetMg:11,copperTargetUg:900,manganeseTargetMg:3,molybdenumTargetUg:45,seleniumTargetUg:55,seleniumUpperLevelUg:255,iodineTargetUg:150,iodineUpperLevelUg:600};
function setup(options:{assigned?:string|null;saved?:boolean;existing?:boolean}={}){const captured:unknown[]=[];const repository={get:async()=>options.existing===false?null:{...values,version:2},save:async(input:unknown)=>{captured.push(input);return options.saved===false?null:{...values,version:3};}};const service=new MineralTargetSettingsService({findById:async()=>submission} as never,{activeConsultant:async()=>options.assigned===undefined?user.id:options.assigned} as never,new AuthorizationPolicy(),repository as never);return{service,captured};}

describe('mineral target settings service',()=>{
  it('returns saved client targets',async()=>expect(await setup().service.get(submissionId,clientId,user)).toEqual({...values,version:2}));
  it('returns an empty version zero profile before first save',async()=>expect(await setup({existing:false}).service.get(submissionId,clientId,user)).toMatchObject({magnesiumTargetMg:null,manganeseTargetMg:null,molybdenumTargetUg:null,iodineUpperLevelUg:null,version:0}));
  it('saves with actor, request and expected version',async()=>{const {service,captured}=setup();await expect(service.save(submissionId,clientId,user,'req-1',2,values)).resolves.toMatchObject({version:3});expect(captured[0]).toMatchObject({clientId,updatedBy:user.id,requestId:'req-1',expectedVersion:2,...values});});
  it('reports a concurrent change and hides an unassigned client',async()=>{await expect(setup({saved:false}).service.save(submissionId,clientId,user,'req',2,values)).rejects.toThrow('MINERAL_TARGETS_VERSION_CONFLICT');await expect(setup({assigned:null}).service.get(submissionId,clientId,user)).rejects.toThrow('RESOURCE_UNAVAILABLE');});
});
