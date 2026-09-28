import {Body,Controller,Get,Headers,HttpCode,Param,Patch,Post,Query,Res} from '@nestjs/common';
import type {Response} from 'express';
import type {AuthenticatedUser} from '../auth/auth.types';
import {CurrentUser} from '../auth/current-user.decorator';
import {AppError} from '../common/app-error';
import {FoodProductManagementService} from './food-product-management.service';
const version=(value:string|undefined)=>{const match=/^(?:W\/)?"?(\d+)"?$/.exec(value??'');if(!match)throw new AppError('IF_MATCH_REQUIRED',428);return Number(match[1]);};
@Controller('admin/food-products')
export class FoodProductManagementController{
  constructor(private readonly products:FoodProductManagementService){}
  @Get() list(@CurrentUser()user:AuthenticatedUser,@Query('status')status?:string,@Query('search')search?:string){return this.products.list(user,status,search);}
  @Get('duplicates') duplicates(@CurrentUser()user:AuthenticatedUser){return this.products.duplicates(user);}
  @Get(':id/history') history(@CurrentUser()user:AuthenticatedUser,@Param('id')id:string){return this.products.history(user,id);}
  @Get(':id') async get(@CurrentUser()user:AuthenticatedUser,@Param('id')id:string,@Res({passthrough:true})res:Response){const result=await this.products.get(user,id);res.setHeader('ETag',`"${result.version}"`);return result;}
  @Post() async create(@CurrentUser()user:AuthenticatedUser,@Headers('x-request-id')requestId:string,@Body()body:Record<string,unknown>,@Res({passthrough:true})res:Response){const result=await this.products.create(user,requestId,body);res.setHeader('ETag',`"${result.version}"`);return result;}
  @Patch(':id') async update(@CurrentUser()user:AuthenticatedUser,@Headers('x-request-id')requestId:string,@Headers('if-match')ifMatch:string|undefined,@Param('id')id:string,@Body()body:Record<string,unknown>,@Res({passthrough:true})res:Response){const result=await this.products.update(user,requestId,id,version(ifMatch),body);res.setHeader('ETag',`"${result.version}"`);return result;}
  @Post(':id/verify') @HttpCode(200) async verify(@CurrentUser()user:AuthenticatedUser,@Headers('x-request-id')requestId:string,@Headers('if-match')ifMatch:string|undefined,@Param('id')id:string,@Res({passthrough:true})res:Response){const result=await this.products.verify(user,requestId,id,version(ifMatch));res.setHeader('ETag',`"${result.version}"`);return result;}
  @Post(':id/merge') @HttpCode(200) merge(@CurrentUser()user:AuthenticatedUser,@Headers('x-request-id')requestId:string,@Headers('if-match')ifMatch:string|undefined,@Param('id')id:string,@Body()body:{primary_id?:unknown;primary_version?:unknown}){return this.products.merge(user,requestId,id,version(ifMatch),body.primary_id,body.primary_version);}
}
