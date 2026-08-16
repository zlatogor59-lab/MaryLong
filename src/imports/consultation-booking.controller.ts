import { Body,Controller,Get,Headers,HttpCode,Param,Patch,Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';import type { AuthenticatedUser } from '../auth/auth.types';import { AppError } from '../common/app-error';import { ConsultationBookingService } from './consultation-booking.service';
@Controller('clients/:clientId/submissions/:submissionId/booking')
export class ConsultationBookingController {constructor(private readonly bookings:ConsultationBookingService){}
  @Get() async get(@Param('clientId')c:string,@Param('submissionId')s:string,@CurrentUser()u:AuthenticatedUser,@Res({passthrough:true})r:Response){const out=await this.bookings.get(s,c,u);r.setHeader('ETag',`"${out.version}"`);return out;}
  @Patch() @HttpCode(200) async save(@Param('clientId')c:string,@Param('submissionId')s:string,@Headers('x-request-id')requestId:string,@Headers('if-match')ifMatch:string|undefined,@Body()body:{status?:unknown;scheduled_at?:unknown;contact_note?:unknown},@CurrentUser()u:AuthenticatedUser,@Res({passthrough:true})r:Response){const match=/^(?:W\/)?"?(\d+)"?$/.exec(ifMatch??'');if(!match)throw new AppError('IF_MATCH_REQUIRED',428);const out=await this.bookings.save(s,c,u,requestId,Number(match[1]),body);r.setHeader('ETag',`"${out.version}"`);return out;}}
