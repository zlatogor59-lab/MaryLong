import { describe,expect,it } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { SubmissionHistoryController } from './submission-history.controller';

const user:AuthenticatedUser={id:'00000000-0000-0000-0000-000000000001',authSubject:'synthetic',role:'consultant',status:'active',sessionIssuedAt:new Date(),sessionRevokedAt:null};
describe('submission history',()=>{
  it('returns only safe metadata',async()=>{
    const controller=new SubmissionHistoryController({listForConsultant:async()=>[{id:'s1',schemaId:'forms_v2_76_columns',status:'verified',consentStatus:'verified',blockCode:null,createdAt:new Date('2026-08-13T10:00:00Z')}]} as never,new AuthorizationPolicy());
    expect(await controller.list('c1','20',user)).toEqual({items:[{submission_id:'s1',schema_id:'forms_v2_76_columns',status:'verified',consent_status:'verified',block_code:null,created_at:'2026-08-13T10:00:00.000Z'}]});
  });
});
