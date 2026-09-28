import {Controller,Get,Headers,HttpCode,Param,Patch,Res} from '@nestjs/common';
import type {Response} from 'express';
import type {AuthenticatedUser} from '../auth/auth.types';
import {CurrentUser} from '../auth/current-user.decorator';
import {AppError} from '../common/app-error';
import {MineralClientExplanationService} from './mineral-client-explanation.service';

@Controller('clients/:clientId/submissions/:submissionId/mineral-client-explanation')
export class MineralClientExplanationController{
  constructor(private readonly explanations:MineralClientExplanationService){}
  @Get() async get(@Param('clientId')clientId:string,@Param('submissionId')submissionId:string,@CurrentUser()user:AuthenticatedUser,@Res({passthrough:true})res:Response){const value=await this.explanations.get(submissionId,clientId,user);res.setHeader('ETag',`"${value.client_approval.version}"`);return value;}
  @Patch('approve') @HttpCode(200) async approve(@Param('clientId')clientId:string,@Param('submissionId')submissionId:string,@Headers('x-request-id')requestId:string,@Headers('if-match')ifMatch:string|undefined,@CurrentUser()user:AuthenticatedUser,@Res({passthrough:true})res:Response){const match=/^(?:W\/)?"?(\d+)"?$/.exec(ifMatch??'');if(!match)throw new AppError('IF_MATCH_REQUIRED',428);const value=await this.explanations.approve(submissionId,clientId,user,requestId,Number(match[1]));res.setHeader('ETag',`"${value.version}"`);return value;}
}
