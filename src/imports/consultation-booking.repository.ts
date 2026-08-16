import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export type BookingStatus='pending'|'scheduled'|'needs_reminder';
export type BookingRecord={id:string;clientId:string;submissionId:string;updatedBy:string;status:BookingStatus;scheduledAt:Date|null;contactNoteCiphertext:Uint8Array;version:number;updatedAt:Date};
type Row={id:string;client_id:string;submission_id:string;updated_by:string;status:BookingStatus;scheduled_at:Date|null;contact_note_ciphertext:Uint8Array;version:number;updated_at:Date};
const map=(r:Row):BookingRecord=>({id:r.id,clientId:r.client_id,submissionId:r.submission_id,updatedBy:r.updated_by,status:r.status,scheduledAt:r.scheduled_at,contactNoteCiphertext:r.contact_note_ciphertext,version:r.version,updatedAt:r.updated_at});

@Injectable()
export class ConsultationBookingRepository {
  constructor(private readonly prisma:PrismaService){}
  async findBySubmission(submissionId:string){const rows=await this.prisma.$queryRaw<Row[]>`SELECT id,client_id,submission_id,updated_by,status::text,scheduled_at,contact_note_ciphertext,version,updated_at FROM consultation_bookings WHERE submission_id=${submissionId}::uuid LIMIT 1`;return rows[0]?map(rows[0]):null;}
  async save(input:{clientId:string;submissionId:string;updatedBy:string;status:BookingStatus;scheduledAt:Date|null;contactNoteCiphertext:Uint8Array;expectedVersion:number;requestId:string}){
    return this.prisma.$transaction(async tx=>{let rows:Row[];
      if(input.expectedVersion===0)rows=await tx.$queryRaw<Row[]>`INSERT INTO consultation_bookings(client_id,submission_id,updated_by,status,scheduled_at,contact_note_ciphertext,version) VALUES(${input.clientId}::uuid,${input.submissionId}::uuid,${input.updatedBy}::uuid,${input.status}::consultation_booking_status,${input.scheduledAt},${Buffer.from(input.contactNoteCiphertext)},1) ON CONFLICT(submission_id) DO NOTHING RETURNING id,client_id,submission_id,updated_by,status::text,scheduled_at,contact_note_ciphertext,version,updated_at`;
      else rows=await tx.$queryRaw<Row[]>`UPDATE consultation_bookings SET updated_by=${input.updatedBy}::uuid,status=${input.status}::consultation_booking_status,scheduled_at=${input.scheduledAt},contact_note_ciphertext=${Buffer.from(input.contactNoteCiphertext)},version=version+1,updated_at=now() WHERE submission_id=${input.submissionId}::uuid AND version=${input.expectedVersion} RETURNING id,client_id,submission_id,updated_by,status::text,scheduled_at,contact_note_ciphertext,version,updated_at`;
      if(!rows[0])return null;const booking=map(rows[0]);
      await tx.$executeRaw`INSERT INTO consultation_booking_versions(booking_id,client_id,submission_id,updated_by,status,scheduled_at,contact_note_ciphertext,version) VALUES(${booking.id}::uuid,${booking.clientId}::uuid,${booking.submissionId}::uuid,${booking.updatedBy}::uuid,${booking.status}::consultation_booking_status,${booking.scheduledAt},${Buffer.from(booking.contactNoteCiphertext)},${booking.version})`;
      await tx.$executeRaw`INSERT INTO audit_events(request_id,actor_user_id,actor_role,action,resource_type,resource_id,client_id,decision,reason_code) VALUES(${input.requestId},${input.updatedBy}::uuid,'consultant','consultation_booking.save','consultation_booking',${booking.id}::uuid,${booking.clientId}::uuid,'SUCCESS','CONSULTATION_BOOKING_SAVED')`;
      return booking;});
  }
}
