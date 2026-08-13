import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import { PrismaService } from '../database/prisma.service';
import { PrismaSubmissionStore } from './prisma-submission.store';

describe.runIf(process.env.RUN_DB_TESTS==='true')('PostgreSQL atomic workflow',()=>{
  const prisma=new PrismaService();const store=new PrismaSubmissionStore(prisma);
  const consultant='10000000-0000-0000-0000-000000000001',admin='10000000-0000-0000-0000-000000000002',client='10000000-0000-0000-0000-000000000010';
  beforeAll(async()=>{await prisma.$connect();await prisma.$executeRawUnsafe(`INSERT INTO users(id,email_normalized,display_name,role,status,auth_subject) VALUES
    ('${consultant}','db-consultant@example.test','DB Synthetic Consultant','consultant','active','db-synthetic-consultant'),
    ('${admin}','db-admin@example.test','DB Synthetic Admin','admin','active','db-synthetic-admin')`);
    await prisma.$executeRawUnsafe(`INSERT INTO clients(id,status,created_by) VALUES ('${client}','active','${consultant}')`);
    await prisma.$executeRawUnsafe(`INSERT INTO form_submissions(id,client_id,schema_id,source_type,header_fingerprint,payload_ciphertext,payload_hash,idempotency_key,import_status,consent_status) VALUES
    ('10000000-0000-0000-0000-000000000020','${client}','forms_v2_76_columns','manual_test','h',decode('01','hex'),'db-hash-1','db-idem-1','verified','verified'),
    ('10000000-0000-0000-0000-000000000021','${client}','forms_v2_76_columns','manual_test','h',decode('01','hex'),'db-hash-2','db-idem-2','verified','verified')`);});
  afterAll(async()=>prisma.$disconnect());
  it('commits state and audit together',async()=>{
    expect(await store.transitionWithAudit({id:'10000000-0000-0000-0000-000000000020',fromStatus:'verified',toStatus:'accepted',requestId:'req_db_ok',actorUserId:consultant,actorRole:'consultant',clientId:client,action:'submission.accept',reasonCode:'SUBMISSION_ACCEPTED'})).toBe(true);
    const rows=await prisma.$queryRawUnsafe<{status:string,audits:bigint}[]>(`SELECT s.import_status::text status,(SELECT count(*) FROM audit_events WHERE request_id='req_db_ok') audits FROM form_submissions s WHERE id='10000000-0000-0000-0000-000000000020'`);
    expect(rows[0].status).toBe('accepted');expect(Number(rows[0].audits)).toBe(1);
  });
  it('rolls state back when audit insert fails',async()=>{
    await expect(store.transitionWithAudit({id:'10000000-0000-0000-0000-000000000021',fromStatus:'verified',toStatus:'accepted',requestId:'req_db_fail',actorUserId:'not-a-uuid',actorRole:'consultant',clientId:client,action:'submission.accept',reasonCode:'SUBMISSION_ACCEPTED'})).rejects.toThrow();
    const rows=await prisma.$queryRawUnsafe<{status:string}[]>(`SELECT import_status::text status FROM form_submissions WHERE id='10000000-0000-0000-0000-000000000021'`);
    expect(rows[0].status).toBe('verified');
  });
});
