import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../database/prisma.service';
import { PrismaSubmissionStore } from './prisma-submission.store';

describe.runIf(process.env.RUN_DB_TESTS==='true')('PostgreSQL atomic workflow',()=>{
  const prisma=new PrismaService();const store=new PrismaSubmissionStore(prisma);
  const consultant=randomUUID(),admin=randomUUID(),client=randomUUID(),submissionOk=randomUUID(),submissionFail=randomUUID();
  const runKey=randomUUID();const requestOk=`req_db_ok_${runKey}`,requestFail=`req_db_fail_${runKey}`;
  beforeAll(async()=>{await prisma.$connect();await prisma.$executeRawUnsafe(`INSERT INTO users(id,email_normalized,display_name,role,status,auth_subject) VALUES
    ('${consultant}','db-consultant-${runKey}@example.test','DB Synthetic Consultant','consultant','active','db-synthetic-consultant-${runKey}'),
    ('${admin}','db-admin-${runKey}@example.test','DB Synthetic Admin','admin','active','db-synthetic-admin-${runKey}')`);
    await prisma.$executeRawUnsafe(`INSERT INTO clients(id,status,created_by) VALUES ('${client}','active','${consultant}')`);
    await prisma.$executeRawUnsafe(`INSERT INTO form_submissions(id,client_id,schema_id,source_type,header_fingerprint,payload_ciphertext,payload_hash,idempotency_key,import_status,consent_status) VALUES
    ('${submissionOk}','${client}','forms_v2_76_columns','manual_test','h',decode('01','hex'),'db-hash-1-${runKey}','db-idem-1-${runKey}','verified','verified'),
    ('${submissionFail}','${client}','forms_v2_76_columns','manual_test','h',decode('01','hex'),'db-hash-2-${runKey}','db-idem-2-${runKey}','verified','verified')`);});
  afterAll(async()=>prisma.$disconnect());
  it('commits state and audit together',async()=>{
    expect(await store.transitionWithAudit({id:submissionOk,fromStatus:'verified',toStatus:'accepted',requestId:requestOk,actorUserId:consultant,actorRole:'consultant',clientId:client,action:'submission.accept',reasonCode:'SUBMISSION_ACCEPTED'})).toBe(true);
    const rows=await prisma.$queryRawUnsafe<{status:string,audits:bigint}[]>(`SELECT s.import_status::text status,(SELECT count(*) FROM audit_events WHERE request_id='${requestOk}') audits FROM form_submissions s WHERE id='${submissionOk}'`);
    expect(rows[0].status).toBe('accepted');expect(Number(rows[0].audits)).toBe(1);
  });
  it('rolls state back when audit insert fails',async()=>{
    await expect(store.transitionWithAudit({id:submissionFail,fromStatus:'verified',toStatus:'accepted',requestId:requestFail,actorUserId:'not-a-uuid',actorRole:'consultant',clientId:client,action:'submission.accept',reasonCode:'SUBMISSION_ACCEPTED'})).rejects.toThrow();
    const rows=await prisma.$queryRawUnsafe<{status:string}[]>(`SELECT import_status::text status FROM form_submissions WHERE id='${submissionFail}'`);
    expect(rows[0].status).toBe('verified');
  });
});
