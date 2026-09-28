import {Body,Controller,Get,Headers,HttpCode,Param,Patch,Res} from '@nestjs/common';
import type {Response} from 'express';
import type {AuthenticatedUser} from '../auth/auth.types';
import {CurrentUser} from '../auth/current-user.decorator';
import {AppError} from '../common/app-error';
import {MineralTargetSettingsService} from './mineral-target-settings.service';

const fields=['magnesium_target_mg','iron_target_mg','zinc_target_mg','copper_target_ug','manganese_target_mg','molybdenum_target_ug','selenium_target_ug','selenium_upper_level_ug','iodine_target_ug','iodine_upper_level_ug'] as const;
const camel=(value:string)=>value.replace(/_([a-z])/g,(_,letter)=>letter.toUpperCase());
@Controller('clients/:clientId/submissions/:submissionId/mineral-targets')
export class MineralTargetSettingsController{
  constructor(private readonly targets:MineralTargetSettingsService){}
  private response(value:object){return Object.fromEntries(Object.entries(value).map(([key,item])=>[key.replace(/[A-Z]/g,letter=>`_${letter.toLowerCase()}`),item]));}
  @Get() async get(@Param('clientId')clientId:string,@Param('submissionId')submissionId:string,@CurrentUser()user:AuthenticatedUser,@Res({passthrough:true})res:Response){const value=await this.targets.get(submissionId,clientId,user);res.setHeader('ETag',`"${value.version}"`);return this.response(value);}
  @Patch() @HttpCode(200) async save(@Param('clientId')clientId:string,@Param('submissionId')submissionId:string,@Headers('x-request-id')requestId:string,@Headers('if-match')ifMatch:string|undefined,@Body()body:Record<string,unknown>,@CurrentUser()user:AuthenticatedUser,@Res({passthrough:true})res:Response){const match=/^(?:W\/)?"?(\d+)"?$/.exec(ifMatch??'');if(!match)throw new AppError('IF_MATCH_REQUIRED',428);const values:Record<string,number|null>={};for(const field of fields){const raw=body[field];if(raw===null||raw===''||raw===undefined)values[camel(field)]=null;else{const value=Number(raw);if(!Number.isFinite(value)||value<=0)throw new AppError('MINERAL_TARGET_INVALID',400);values[camel(field)]=value;}}if(values.seleniumTargetUg!==null&&values.seleniumUpperLevelUg!==null&&values.seleniumUpperLevelUg<=values.seleniumTargetUg)throw new AppError('SELENIUM_UPPER_LEVEL_INVALID',400);if(values.iodineTargetUg!==null&&values.iodineUpperLevelUg!==null&&values.iodineUpperLevelUg<=values.iodineTargetUg)throw new AppError('IODINE_UPPER_LEVEL_INVALID',400);const saved=await this.targets.save(submissionId,clientId,user,requestId,Number(match[1]),values as never);res.setHeader('ETag',`"${saved.version}"`);return this.response(saved);}
}
