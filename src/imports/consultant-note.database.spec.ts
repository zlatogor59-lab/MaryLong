import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import { PrismaService } from '../database/prisma.service';
import { ConsultantNoteRepository } from './consultant-note.repository';

describe.runIf(process.env.RUN_DB_TESTS==='true')('PostgreSQL consultant note concurrency',()=>{
  const prisma=new PrismaService(),notes=new ConsultantNoteRepository(prisma);
  const consultant='14000000-0000-0000-0000-000000000001',client='14000000-0000-0000-0000-000000000010',submission='14000000-0000-0000-0000-000000000020';
  beforeAll(async()=>{await prisma.$connect();await prisma.$executeRawUnsafe(`INSERT INTO users(id,email_normalized,display_name,role,status,auth_subject) VALUES
    ('${consultant}','note-db-consultant@example.test','Note DB Synthetic Consultant','consultant','active','note-db-synthetic-consultant')`);
    await prisma.$executeRawUnsafe(`INSERT INTO clients(id,status,created_by) VALUES ('${client}','active','${consultant}')`);
    await prisma.$executeRawUnsafe(`INSERT INTO form_submissions(id,client_id,schema_id,source_type,header_fingerprint,payload_ciphertext,payload_hash,idempotency_key,import_status,consent_status) VALUES
    ('${submission}','${client}','forms_v2_76_columns','manual_test','h',decode('01','hex'),'note-db-hash','note-db-idem','accepted','verified')`);});
  afterAll(async()=>prisma.$disconnect());

  it('allows only one writer for a version and atomically records version plus audit',async()=>{
    const first=await notes.save({clientId:client,submissionId:submission,authorUserId:consultant,bodyCiphertext:Buffer.from('cipher-1'),expectedVersion:0,requestId:'req_note_db_1'});
    expect(first?.version).toBe(1);
    const competing=await Promise.all([
      notes.save({clientId:client,submissionId:submission,authorUserId:consultant,bodyCiphertext:Buffer.from('cipher-2a'),expectedVersion:1,requestId:'req_note_db_2a'}),
      notes.save({clientId:client,submissionId:submission,authorUserId:consultant,bodyCiphertext:Buffer.from('cipher-2b'),expectedVersion:1,requestId:'req_note_db_2b'}),
    ]);
    expect(competing.filter(Boolean)).toHaveLength(1);
    const rows=await prisma.$queryRawUnsafe<{version:number;versions:bigint;audits:bigint}[]>(`SELECT n.version,
      (SELECT count(*) FROM consultant_note_versions v WHERE v.note_id=n.id) versions,
      (SELECT count(*) FROM audit_events a WHERE a.resource_id=n.id AND a.action='consultant_note.save') audits
      FROM consultant_notes n WHERE n.submission_id='${submission}'`);
    expect(rows[0].version).toBe(2);expect(Number(rows[0].versions)).toBe(2);expect(Number(rows[0].audits)).toBe(2);
  });
});
