import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type ConsultantNoteRecord = { id:string; clientId:string; submissionId:string; authorUserId:string; bodyCiphertext:Uint8Array; version:number; updatedAt:Date };
type Row = { id:string; client_id:string; submission_id:string; author_user_id:string; body_ciphertext:Uint8Array; version:number; updated_at:Date };
const map=(row:Row):ConsultantNoteRecord=>({id:row.id,clientId:row.client_id,submissionId:row.submission_id,authorUserId:row.author_user_id,
  bodyCiphertext:row.body_ciphertext,version:row.version,updatedAt:row.updated_at});

@Injectable()
export class ConsultantNoteRepository {
  constructor(private readonly prisma:PrismaService) {}

  async findBySubmission(submissionId:string) {
    const rows=await this.prisma.$queryRaw<Row[]>`SELECT id,client_id,submission_id,author_user_id,body_ciphertext,version,updated_at
      FROM consultant_notes WHERE submission_id=${submissionId}::uuid LIMIT 1`;
    return rows[0]?map(rows[0]):null;
  }

  async save(input:{clientId:string;submissionId:string;authorUserId:string;bodyCiphertext:Uint8Array;expectedVersion:number;requestId:string}) {
    return this.prisma.$transaction(async tx=>{
      let rows:Row[];
      if(input.expectedVersion===0) {
        rows=await tx.$queryRaw<Row[]>`INSERT INTO consultant_notes (client_id,submission_id,author_user_id,body_ciphertext,version)
          VALUES (${input.clientId}::uuid,${input.submissionId}::uuid,${input.authorUserId}::uuid,${Buffer.from(input.bodyCiphertext)},1)
          ON CONFLICT (submission_id) DO NOTHING
          RETURNING id,client_id,submission_id,author_user_id,body_ciphertext,version,updated_at`;
      } else {
        rows=await tx.$queryRaw<Row[]>`UPDATE consultant_notes SET author_user_id=${input.authorUserId}::uuid,
          body_ciphertext=${Buffer.from(input.bodyCiphertext)},version=version+1,updated_at=now()
          WHERE submission_id=${input.submissionId}::uuid AND version=${input.expectedVersion}
          RETURNING id,client_id,submission_id,author_user_id,body_ciphertext,version,updated_at`;
      }
      if(!rows[0])return null;
      const note=map(rows[0]);
      await tx.$executeRaw`INSERT INTO consultant_note_versions (note_id,client_id,submission_id,author_user_id,body_ciphertext,version)
        VALUES (${note.id}::uuid,${note.clientId}::uuid,${note.submissionId}::uuid,${note.authorUserId}::uuid,${Buffer.from(note.bodyCiphertext)},${note.version})`;
      await tx.$executeRaw`INSERT INTO audit_events (request_id,actor_user_id,actor_role,action,resource_type,resource_id,client_id,decision,reason_code)
        VALUES (${input.requestId},${input.authorUserId}::uuid,'consultant','consultant_note.save','consultant_note',${note.id}::uuid,
          ${note.clientId}::uuid,'SUCCESS','CONSULTANT_NOTE_SAVED')`;
      return note;
    },{maxWait:5_000});
  }
}
