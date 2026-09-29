import {Body,Controller,Get,Headers,HttpCode,Param,Post} from '@nestjs/common';
import type {AuthenticatedUser} from '../auth/auth.types';
import {CurrentUser} from '../auth/current-user.decorator';
import {DailyRationSnapshotService} from './daily-ration-snapshot.service';

@Controller('clients/:clientId/submissions/:submissionId/daily-ration-snapshots')
export class DailyRationSnapshotController{
  constructor(private readonly snapshots:DailyRationSnapshotService){}
  @Get() list(@Param('clientId')clientId:string,@Param('submissionId')submissionId:string,@CurrentUser()user:AuthenticatedUser){return this.snapshots.list(submissionId,clientId,user);}
  @Post() @HttpCode(201) capture(@Param('clientId')clientId:string,@Param('submissionId')submissionId:string,@Headers('x-request-id')requestId:string,@Body()body:{ration_date?:unknown},@CurrentUser()user:AuthenticatedUser){return this.snapshots.capture(submissionId,clientId,user,requestId,String(body.ration_date??''));}
}
