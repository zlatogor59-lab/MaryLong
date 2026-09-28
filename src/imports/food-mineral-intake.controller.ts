import {Controller,Get,Param,Query} from '@nestjs/common';
import type {AuthenticatedUser} from '../auth/auth.types';
import {CurrentUser} from '../auth/current-user.decorator';
import {AppError} from '../common/app-error';
import type {FoodMineralKey,MineralUnit} from './food-mineral-intake.calculator';
import {FoodMineralIntakeService} from './food-mineral-intake.service';

const nutrients=new Set<FoodMineralKey>(['calcium','phosphorus','magnesium','iron','zinc','copper','manganese','molybdenum','sodium','potassium']);
@Controller('clients/:clientId/submissions/:submissionId/food-minerals')
export class FoodMineralIntakeController {constructor(private readonly minerals:FoodMineralIntakeService){}
  @Get(':nutrient') get(@Param('clientId')clientId:string,@Param('submissionId')submissionId:string,@Param('nutrient')rawNutrient:string,@Query('target')rawTarget:string|undefined,@Query('unit')rawUnit:string|undefined,@CurrentUser()user:AuthenticatedUser){
    if(!nutrients.has(rawNutrient as FoodMineralKey))throw new AppError('NUTRIENT_NOT_SUPPORTED',400);const nutrient=rawNutrient as FoodMineralKey;
    const unit=(rawUnit??(['copper','molybdenum'].includes(nutrient)?'ug':'mg')) as MineralUnit;if(unit!=='mg'&&unit!=='ug')throw new AppError('MINERAL_UNIT_INVALID',400);
    const target=rawTarget===undefined||rawTarget===''?null:Number(rawTarget);if(target!==null&&(!Number.isFinite(target)||target<=0))throw new AppError('MINERAL_TARGET_INVALID',400);
    return this.minerals.get(submissionId,clientId,user,nutrient,target,unit);
  }
}
