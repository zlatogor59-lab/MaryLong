import { Body,Controller,Get,Headers,HttpCode,Param,Patch,Res } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types';import { CurrentUser } from '../auth/current-user.decorator';import { AppError } from '../common/app-error';import { ProteinTargetService } from './protein-target.service';
@Controller('clients/:clientId/submissions/:submissionId/protein-target')
export class ProteinTargetController {constructor(private readonly targets:ProteinTargetService){}
  @Get() async get(@Param('clientId')c:string,@Param('submissionId')s:string,@CurrentUser()u:AuthenticatedUser,@Res({passthrough:true})r:Response){const out=await this.targets.get(s,c,u);r.setHeader('ETag',`"${out.version}"`);return out;}
  @Patch() @HttpCode(200) async save(@Param('clientId')c:string,@Param('submissionId')s:string,@Headers('x-request-id')requestId:string,@Headers('if-match')ifMatch:string|undefined,@Body()body:{source?:unknown;protein_factor_g?:unknown;target_min_g?:unknown;target_max_g?:unknown;reason?:unknown},@CurrentUser()u:AuthenticatedUser,@Res({passthrough:true})r:Response){const match=/^(?:W\/)?"?(\d+)"?$/.exec(ifMatch??'');if(!match)throw new AppError('IF_MATCH_REQUIRED',428);const out=await this.targets.save(s,c,u,requestId,Number(match[1]),body);r.setHeader('ETag',`"${out.version}"`);return out;}}
