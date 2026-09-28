import { Controller, Get, Param, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { AppError } from '../common/app-error';
import { SodiumPotassiumService } from './sodium-potassium.service';

@Controller('clients/:clientId/submissions/:submissionId/sodium-potassium')
export class SodiumPotassiumController {
  constructor(private readonly sodiumPotassium: SodiumPotassiumService) {}

  @Get()
  get(
    @Param('clientId') clientId: string,
    @Param('submissionId') submissionId: string,
    @Query('potassiumTargetMg') rawTarget: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const target = rawTarget === undefined || rawTarget === '' ? 3500 : Number(rawTarget);
    if (!Number.isFinite(target) || target <= 0) throw new AppError('POTASSIUM_TARGET_INVALID', 400);
    return this.sodiumPotassium.get(submissionId, clientId, user, target);
  }
}
