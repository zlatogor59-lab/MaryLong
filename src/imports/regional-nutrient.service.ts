import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { AppError, unavailable } from '../common/app-error';
import { AssignmentRepository } from './assignment.repository';
import { cofidFoodKey, regionalNutrientCatalog } from './regional-nutrient.catalog';
import { calculateRegionalNutrientIntake, type NutrientKey } from './regional-nutrient.calculator';
import { FoodProductRepository } from './food-product.repository';
import { PayloadCryptoService } from './payload-crypto.service';
import { ProteinIntakeRepository } from './protein-intake.repository';
import { SubmissionStore } from './submission.store';
import { RegionalNutrientSettingsRepository } from './regional-nutrient-settings.repository';

export type RegionalNutrientQuery = {
  nutrient: NutrientKey;
  marketCountry: string | null;
  targetUg: number | null;
  upperLevelUg: number | null;
  period: 'single_day' | 'habitual';
};

@Injectable()
export class RegionalNutrientService {
  constructor(
    private readonly store: SubmissionStore,
    private readonly assignments: AssignmentRepository,
    private readonly policy: AuthorizationPolicy,
    private readonly proteinIntake: ProteinIntakeRepository,
    private readonly products: FoodProductRepository,
    private readonly crypto: PayloadCryptoService,
    private readonly settings: RegionalNutrientSettingsRepository,
  ) {}

  private async requireSubmission(submissionId: string, clientId: string, user: AuthenticatedUser) {
    this.policy.requireRole(user, 'consultant');
    const submission = await this.store.findById(submissionId);
    if (!submission || submission.clientId !== clientId) throw unavailable('SUBMISSION_NOT_FOUND');
    this.policy.requireActiveAssignment(user, await this.assignments.activeConsultant(clientId));
    if (submission.status !== 'accepted') throw unavailable('SUBMISSION_NOT_ACCEPTED');
  }

  async getSettings(submissionId: string, clientId: string, user: AuthenticatedUser) {
    await this.requireSubmission(submissionId, clientId, user);
    const settings = await this.settings.get(clientId, submissionId);
    return {
      client_default: settings.client ? { market_country: settings.client.marketCountry, version: settings.client.version } : null,
      submission_override: settings.submission ? { market_country: settings.submission.marketCountry, version: settings.submission.version } : null,
      effective_market_country: settings.submission?.marketCountry ?? settings.client?.marketCountry ?? 'UNKNOWN',
      effective_source: settings.submission ? 'submission' : settings.client ? 'client' : 'unknown',
    };
  }

  async saveSettings(submissionId: string, clientId: string, user: AuthenticatedUser, requestId: string, body: { scope: 'client' | 'submission'; marketCountry: string; expectedVersion: number }) {
    await this.requireSubmission(submissionId, clientId, user);
    const saved = body.scope === 'client'
      ? await this.settings.saveClient({ clientId, marketCountry: body.marketCountry, updatedBy: user.id, expectedVersion: body.expectedVersion, requestId })
      : await this.settings.saveSubmission({ clientId, submissionId, marketCountry: body.marketCountry, updatedBy: user.id, expectedVersion: body.expectedVersion, requestId });
    if (!saved) throw new AppError('REGIONAL_NUTRIENT_SETTINGS_VERSION_CONFLICT', 409);
    return this.getSettings(submissionId, clientId, user);
  }

  async get(submissionId: string, clientId: string, user: AuthenticatedUser, query: RegionalNutrientQuery) {
    await this.requireSubmission(submissionId, clientId, user);
    const assessment = await this.proteinIntake.findBySubmission(submissionId);
    if (!assessment) return { submission_id: submissionId, source_intake_version: 0, assessment: null };

    let payload: { items?: Array<{ productCardId: string; massG: number; foodIdentity?: string }>; saltCoffeeItems?: Array<{catalogKey:string;massG?:number;iodineUgPerG?:number;labelSource?:string;labelVersion?:string}> };
    try {
      payload = JSON.parse(Buffer.from(await this.crypto.decrypt(assessment.payloadCiphertext)).toString('utf8'));
    } catch {
      throw new AppError('PROTEIN_INTAKE_INTEGRITY_FAILED', 409);
    }
    const inputs = payload.items ?? [];
    const cards = await this.products.verifiedByIds(inputs.map(item => item.productCardId));
    const foods = inputs.map(item => {
      const product = cards.get(item.productCardId);
      return {
        foodKey: item.foodIdentity && item.foodIdentity !== 'exact' ? item.foodIdentity : cofidFoodKey(product?.sourceLabel) ?? `unresolved:${item.productCardId}`,
        displayName: product?.name ?? 'Неподтверждённый продукт',
        massG: item.massG,
      };
    });
    const extraSources=[] as typeof regionalNutrientCatalog;
    if(query.nutrient==='iodine')for(const [index,item] of (payload.saltCoffeeItems??[]).entries()){
      if(item.catalogKey==='SC-SALT-UNSPECIFIED')foods.push({foodKey:`salt-iodization-unknown:${index}`,displayName:'Добавленная соль — йодирование неизвестно',massG:Number(item.massG)});
      if(item.catalogKey==='SC-SALT-IODIZED-LABEL'){
        const foodKey=`iodized-salt-label:${index}`,iodinePer100g=Number(item.iodineUgPerG)*100;
        foods.push({foodKey,displayName:'Йодированная соль — по этикетке',massG:Number(item.massG)});
        if(Number.isFinite(iodinePer100g)&&iodinePer100g>0&&item.labelSource?.trim()&&item.labelVersion?.trim())extraSources.push({foodKey,nutrient:'iodine',unit:'ug',per100g:{low:iodinePer100g,central:iodinePer100g,high:iodinePer100g},sourceDataset:`Этикетка: ${item.labelSource.trim()}`,sourceCountry:null,sourceVersion:item.labelVersion.trim(),datasetTier:'product_label',valueType:'label',confidence:'high',uncertaintyReason:null});
      }
    }
    const savedSettings = query.marketCountry ? null : await this.settings.get(clientId, submissionId);
    const marketCountry = query.marketCountry ?? savedSettings?.submission?.marketCountry ?? savedSettings?.client?.marketCountry ?? 'UNKNOWN';
    const result = calculateRegionalNutrientIntake(
      marketCountry,
      query.nutrient,
      foods,
      [...regionalNutrientCatalog,...extraSources],
      { targetUg: query.targetUg, upperLevelUg: query.upperLevelUg, period: query.period },
    );
    return { submission_id: submissionId, source_intake_version: assessment.version, assessment: result };
  }
}
