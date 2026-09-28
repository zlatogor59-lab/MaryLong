import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type Row = { market_country: string; version: number; updated_at: Date };
export type MarketSetting = { marketCountry: string; version: number; updatedAt: Date };
const map = (row: Row): MarketSetting => ({ marketCountry: row.market_country, version: row.version, updatedAt: row.updated_at });

@Injectable()
export class RegionalNutrientSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async get(clientId: string, submissionId: string) {
    const [clientRows, submissionRows] = await Promise.all([
      this.prisma.$queryRaw<Row[]>`SELECT market_country,version,updated_at FROM client_regional_nutrient_settings WHERE client_id=${clientId}::uuid`,
      this.prisma.$queryRaw<Row[]>`SELECT market_country,version,updated_at FROM submission_regional_nutrient_settings WHERE submission_id=${submissionId}::uuid AND client_id=${clientId}::uuid`,
    ]);
    return { client: clientRows[0] ? map(clientRows[0]) : null, submission: submissionRows[0] ? map(submissionRows[0]) : null };
  }

  async saveClient(input: { clientId: string; marketCountry: string; updatedBy: string; expectedVersion: number; requestId: string }) {
    return this.prisma.$transaction(async tx => {
      const rows = input.expectedVersion === 0
        ? await tx.$queryRaw<Row[]>`INSERT INTO client_regional_nutrient_settings(client_id,market_country,updated_by) VALUES(${input.clientId}::uuid,${input.marketCountry},${input.updatedBy}::uuid) ON CONFLICT(client_id) DO NOTHING RETURNING market_country,version,updated_at`
        : await tx.$queryRaw<Row[]>`UPDATE client_regional_nutrient_settings SET market_country=${input.marketCountry},updated_by=${input.updatedBy}::uuid,version=version+1,updated_at=now() WHERE client_id=${input.clientId}::uuid AND version=${input.expectedVersion} RETURNING market_country,version,updated_at`;
      if (!rows[0]) return null;
      await tx.$executeRaw`INSERT INTO audit_events(request_id,actor_user_id,actor_role,action,resource_type,client_id,decision,reason_code) VALUES(${input.requestId},${input.updatedBy}::uuid,'consultant','regional_nutrient_market.save_client','client_regional_nutrient_setting',${input.clientId}::uuid,'SUCCESS','REGIONAL_NUTRIENT_MARKET_SAVED')`;
      return map(rows[0]);
    });
  }

  async saveSubmission(input: { clientId: string; submissionId: string; marketCountry: string; updatedBy: string; expectedVersion: number; requestId: string }) {
    return this.prisma.$transaction(async tx => {
      const rows = input.expectedVersion === 0
        ? await tx.$queryRaw<Row[]>`INSERT INTO submission_regional_nutrient_settings(submission_id,client_id,market_country,updated_by) VALUES(${input.submissionId}::uuid,${input.clientId}::uuid,${input.marketCountry},${input.updatedBy}::uuid) ON CONFLICT(submission_id) DO NOTHING RETURNING market_country,version,updated_at`
        : await tx.$queryRaw<Row[]>`UPDATE submission_regional_nutrient_settings SET market_country=${input.marketCountry},updated_by=${input.updatedBy}::uuid,version=version+1,updated_at=now() WHERE submission_id=${input.submissionId}::uuid AND client_id=${input.clientId}::uuid AND version=${input.expectedVersion} RETURNING market_country,version,updated_at`;
      if (!rows[0]) return null;
      await tx.$executeRaw`INSERT INTO audit_events(request_id,actor_user_id,actor_role,action,resource_type,resource_id,client_id,decision,reason_code) VALUES(${input.requestId},${input.updatedBy}::uuid,'consultant','regional_nutrient_market.save_submission','submission_regional_nutrient_setting',${input.submissionId}::uuid,${input.clientId}::uuid,'SUCCESS','REGIONAL_NUTRIENT_MARKET_SAVED')`;
      return map(rows[0]);
    });
  }
}
