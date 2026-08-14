import { Body, Controller, Get, Headers, HttpCode, Param, Patch, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AppError } from '../common/app-error';
import { ConsultantNoteService } from './consultant-note.service';

@Controller('clients/:clientId/submissions/:submissionId/note')
export class ConsultantNoteController {
  constructor(private readonly notes:ConsultantNoteService) {}

  @Get()
  async get(@Param('clientId') clientId:string,@Param('submissionId') submissionId:string,@Headers('x-request-id') requestId:string,
    @CurrentUser() user:AuthenticatedUser,@Res({passthrough:true}) response:Response) {
    const result=await this.notes.get(submissionId,clientId,user,requestId);
    response.setHeader('ETag',`"${result.version}"`);
    return result;
  }

  @Patch()
  @HttpCode(200)
  async save(@Param('clientId') clientId:string,@Param('submissionId') submissionId:string,@Headers('x-request-id') requestId:string,
    @Headers('if-match') ifMatch:string|undefined,@Body() body:{body?:unknown},@CurrentUser() user:AuthenticatedUser,
    @Res({passthrough:true}) response:Response) {
    const match=/^(?:W\/)?"?(\d+)"?$/.exec(ifMatch??'');
    if(!match)throw new AppError('IF_MATCH_REQUIRED',428);
    const result=await this.notes.save(submissionId,clientId,user,requestId,Number(match[1]),body?.body);
    response.setHeader('ETag',`"${result.version}"`);
    return result;
  }
}
