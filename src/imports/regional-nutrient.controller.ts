import { Body, Controller, Get, Headers, Param, Patch, Query } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { AppError } from '../common/app-error';
import { RegionalNutrientService } from './regional-nutrient.service';

const optionalPositiveNumber = (value: string | undefined, name: string): number | null => {
  if (value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new AppError(`${name.toUpperCase()}_INVALID`, 400);
  return parsed;
};

@Controller('clients/:clientId/submissions/:submissionId/regional-nutrients')
export class RegionalNutrientController {
  constructor(private readonly nutrients: RegionalNutrientService) {}

  @Get('settings')
  settings(@Param('clientId') clientId: string, @Param('submissionId') submissionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.nutrients.getSettings(submissionId, clientId, user);
  }

  @Patch('settings')
  saveSettings(@Param('clientId') clientId: string, @Param('submissionId') submissionId: string, @Headers('x-request-id') requestId: string, @Body() body: Record<string, unknown>, @CurrentUser() user: AuthenticatedUser) {
    const scope = body.scope;
    const marketCountry = String(body.market_country ?? '').trim().toUpperCase();
    const expectedVersion = Number(body.expected_version);
    if (scope !== 'client' && scope !== 'submission') throw new AppError('SETTINGS_SCOPE_INVALID', 400);
    if (!/^[A-Z]{2}$/.test(marketCountry) && marketCountry !== 'MULTI' && marketCountry !== 'UNKNOWN') throw new AppError('MARKET_COUNTRY_INVALID', 400);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0) throw new AppError('SETTINGS_VERSION_INVALID', 400);
    return this.nutrients.saveSettings(submissionId, clientId, user, requestId, { scope, marketCountry, expectedVersion });
  }

  @Get(':nutrient')
  get(
    @Param('clientId') clientId: string,
    @Param('submissionId') submissionId: string,
    @Param('nutrient') nutrient: string,
    @Query('marketCountry') marketCountry: string | undefined,
    @Query('targetUg') targetUg: string | undefined,
    @Query('upperLevelUg') upperLevelUg: string | undefined,
    @Query('period') period: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (nutrient !== 'selenium' && nutrient !== 'iodine') throw new AppError('NUTRIENT_NOT_SUPPORTED', 400);
    const country = marketCountry === undefined ? null : marketCountry.trim().toUpperCase();
    if (country !== null && !/^[A-Z]{2}$/.test(country) && country !== 'MULTI' && country !== 'UNKNOWN') throw new AppError('MARKET_COUNTRY_INVALID', 400);
    if (period !== 'single_day' && period !== 'habitual') throw new AppError('ASSESSMENT_PERIOD_INVALID', 400);
    return this.nutrients.get(submissionId, clientId, user, {
      nutrient,
      marketCountry: country,
      targetUg: optionalPositiveNumber(targetUg, 'target_ug'),
      upperLevelUg: optionalPositiveNumber(upperLevelUg, 'upper_level_ug'),
      period,
    });
  }
}
