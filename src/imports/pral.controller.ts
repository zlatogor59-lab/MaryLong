import{Controller,Get,Param}from'@nestjs/common';
import type{AuthenticatedUser}from'../auth/auth.types';
import{CurrentUser}from'../auth/current-user.decorator';
import{PralService}from'./pral.service';
@Controller('clients/:clientId/submissions/:submissionId/acid-load/pral')export class PralController{constructor(private readonly pral:PralService){}@Get()get(@Param('clientId')clientId:string,@Param('submissionId')submissionId:string,@CurrentUser()user:AuthenticatedUser){return this.pral.get(submissionId,clientId,user);}}
