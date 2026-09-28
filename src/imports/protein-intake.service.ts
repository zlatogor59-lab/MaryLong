import { HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { AppError, unavailable } from '../common/app-error';
import { AssignmentRepository } from './assignment.repository';
import { FoodProductRepository } from './food-product.repository';
import { calculateProteinClientExplanation } from './protein-client-explanation.calculator';
import { calculateProteinIntake, type FoodIdentity, type IntakeInput } from './protein-intake.calculator';
import { calculateProcessedMeat } from './processed-meat.calculator';
import { calculateSaltCoffee, type SaltCoffeeInput } from './salt-coffee.calculator';
import { ProteinIntakeRepository, type ProteinIntakeRecord } from './protein-intake.repository';
import { NutrientClientPublicationRepository } from './nutrient-client-publication.repository';
import { PayloadCryptoService } from './payload-crypto.service';
import { ProteinTargetRepository } from './protein-target.repository';
import { SubmissionStore } from './submission.store';

const MEALS = new Set(['breakfast', 'snack_1', 'lunch', 'snack_2', 'dinner', 'bedtime', 'other']);
const FOOD_IDENTITIES = new Set<FoodIdentity>(['exact', 'generic_fish', 'generic_marine_fish', 'generic_freshwater_fish']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ProteinIntakeService {
  constructor(private readonly store: SubmissionStore, private readonly assignments: AssignmentRepository, private readonly policy: AuthorizationPolicy, private readonly products: FoodProductRepository, private readonly assessments: ProteinIntakeRepository, private readonly targets: ProteinTargetRepository, private readonly crypto: PayloadCryptoService, private readonly publications: NutrientClientPublicationRepository) {}

  private async requireSubmission(submissionId: string, clientId: string, user: AuthenticatedUser) { this.policy.requireRole(user, 'consultant'); const submission = await this.store.findById(submissionId); if (!submission || submission.clientId !== clientId) throw unavailable('SUBMISSION_NOT_FOUND'); this.policy.requireActiveAssignment(user, await this.assignments.activeConsultant(clientId)); if (submission.status !== 'accepted') throw unavailable('SUBMISSION_NOT_ACCEPTED'); }
  async listProducts(clientId: string, user: AuthenticatedUser) { this.policy.requireRole(user, 'consultant'); this.policy.requireActiveAssignment(user, await this.assignments.activeConsultant(clientId)); return { items: await this.products.listVerified() }; }
  async get(submissionId: string, clientId: string, user: AuthenticatedUser) { await this.requireSubmission(submissionId, clientId, user); const assessment = await this.assessments.findBySubmission(submissionId); if (!assessment) return { submission_id: submissionId, items: [], salt_coffee_items:[], salt_coffee:calculateSaltCoffee([]), summary: null, client_explanation: null, client_approval: { status: 'draft', version: 0, approved_at: null }, version: 0, updated_at: null }; return this.withPublication(this.dto(assessment, await this.decrypt(assessment), await this.targets.findBySubmission(submissionId))); }

  async save(submissionId: string, clientId: string, user: AuthenticatedUser, requestId: string, expectedVersion: number, body: { items?: unknown; salt_coffee_items?: unknown }) {
    await this.requireSubmission(submissionId, clientId, user);
    if (!Array.isArray(body.items) || body.items.length > 100) throw this.invalid();
    const inputs: IntakeInput[] = body.items.map(value => {
      if (!value || typeof value !== 'object') throw this.invalid();
      const raw = value as Record<string, unknown>, mealKey = String(raw.meal_key ?? ''), productCardId = String(raw.product_card_id ?? ''), massG = Number(raw.mass_g), foodIdentity = String(raw.food_identity ?? 'exact') as FoodIdentity;
      if (!MEALS.has(mealKey) || !UUID.test(productCardId) || !Number.isFinite(massG) || massG <= 0 || massG > 5000 || !FOOD_IDENTITIES.has(foodIdentity)) throw this.invalid();
      return { mealKey, productCardId, massG, foodIdentity };
    });
    if(body.salt_coffee_items!==undefined&&!Array.isArray(body.salt_coffee_items))throw this.invalid();
    if((body.salt_coffee_items??[]).length>100)throw this.invalid();
    const saltCoffeeItems=((body.salt_coffee_items??[]) as Record<string,unknown>[]).map(raw=>{const mealKey=String(raw.meal_key??''),item:SaltCoffeeInput={mealKey,catalogKey:String(raw.catalog_key??'')};if(!MEALS.has(mealKey))throw this.invalid();if(raw.mass_g!==undefined)item.massG=Number(raw.mass_g);if(raw.volume_ml!==undefined)item.volumeMl=Number(raw.volume_ml);if(raw.amount_unknown===true)item.amountUnknown=true;if(raw.iodine_ug_per_g!==undefined)item.iodineUgPerG=Number(raw.iodine_ug_per_g);if(raw.label_source!==undefined)item.labelSource=String(raw.label_source);if(raw.label_version!==undefined)item.labelVersion=String(raw.label_version);return item;});
    let saltCoffee;try{saltCoffee=calculateSaltCoffee(saltCoffeeItems);}catch{throw this.invalid();}
    const productMap = await this.products.verifiedByIds([...new Set(inputs.map(item => item.productCardId))]), calculation = calculateProteinIntake(inputs, productMap), payload = { items: inputs, calculation, saltCoffeeItems, saltCoffee };
    const saved = await this.assessments.save({ clientId, submissionId, updatedBy: user.id, payloadCiphertext: await this.crypto.encrypt(Buffer.from(JSON.stringify(payload))), totalProteinG: calculation.totalProteinG, plantProteinG: calculation.plantProteinG, animalProteinG: calculation.animalProteinG, completenessPercent: calculation.completenessPercent, expectedVersion, requestId });
    if (!saved) throw new AppError('PROTEIN_INTAKE_VERSION_CONFLICT', HttpStatus.CONFLICT);
    return this.withPublication(this.dto(saved, payload, await this.targets.findBySubmission(submissionId)));
  }

  async approveClientExplanation(submissionId: string, clientId: string, user: AuthenticatedUser, requestId: string, expectedVersion: number) { const current = await this.get(submissionId, clientId, user); if (!current.client_explanation || current.version < 1) throw new AppError('PROTEIN_CLIENT_EXPLANATION_UNAVAILABLE', HttpStatus.CONFLICT); const serialized = JSON.stringify(current.client_explanation), hash = this.hash(current.client_explanation), explanationCiphertext = await this.crypto.encrypt(Buffer.from(serialized)), saved = await this.publications.approve({ clientId, submissionId, nutrientKey: 'protein', sourceIntakeVersion: current.version, targetVersion: current.target_version, explanationHash: hash, explanationCiphertext, approvedBy: user.id, expectedVersion, requestId }); if (!saved) throw new AppError('PROTEIN_CLIENT_EXPLANATION_VERSION_CONFLICT', HttpStatus.CONFLICT); return { status: 'approved', version: saved.version, approved_at: saved.approvedAt.toISOString() }; }
  private async withPublication(dto: any) { const explanation = calculateProteinClientExplanation(dto.summary), hash = this.hash(explanation), approval = await this.publications.find(dto.submission_id, 'protein'), current = Boolean(approval && approval.sourceIntakeVersion === dto.version && approval.targetVersion === dto.target_version && approval.explanationHash === hash); return { ...dto, client_explanation: explanation, client_approval: { status: current ? 'approved' : 'draft', version: approval?.version ?? 0, approved_at: current ? approval?.approvedAt.toISOString() ?? null : null } }; }
  private dto(assessment: ProteinIntakeRecord, payload: any, target: any) { const calculation = payload.calculation, total = assessment.totalProteinG, plantShare = total ? assessment.plantProteinG / total * 100 : null; let rangeStatus = 'target_not_set'; if (assessment.completenessPercent < 100) rangeStatus = 'incomplete_data'; else if (target) rangeStatus = total < target.targetMinG ? 'below_range' : total > target.targetMaxG ? 'above_range' : 'within_range'; return { submission_id: assessment.submissionId, items: (payload.items ?? []).map((item: IntakeInput) => ({ meal_key: item.mealKey, product_card_id: item.productCardId, mass_g: item.massG, food_identity: item.foodIdentity ?? 'exact' })), salt_coffee_items:payload.saltCoffeeItems??[], salt_coffee:payload.saltCoffee??calculateSaltCoffee([]), lines: calculation.lines, unresolved: calculation.unresolved, processed_meat: calculateProcessedMeat(calculation.lines??[]), summary: { total_protein_g: this.round(total), plant_protein_g: this.round(assessment.plantProteinG), animal_protein_g: this.round(assessment.animalProteinG), plant_share_percent: plantShare === null ? null : this.round(plantShare), plant_share_status: plantShare === null ? 'unavailable' : plantShare >= 50 ? 'meets_guide' : 'below_guide', completeness_percent: assessment.completenessPercent, meal_totals: calculation.mealTotals.map((meal: any) => ({ meal_key: meal.mealKey, protein_g: this.round(meal.proteinG) })), target_min_g: target?.targetMinG ?? null, target_max_g: target?.targetMaxG ?? null, range_status: rangeStatus }, target_version: target?.version ?? 0, version: assessment.version, updated_at: assessment.updatedAt.toISOString() }; }
  private async decrypt(assessment: ProteinIntakeRecord) { try { return JSON.parse(Buffer.from(await this.crypto.decrypt(assessment.payloadCiphertext)).toString('utf8')); } catch { throw new AppError('PROTEIN_INTAKE_INTEGRITY_FAILED', HttpStatus.CONFLICT); } }
  private hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
  private round(value: number) { return Number(value.toFixed(2)); }
  private invalid() { return new AppError('PROTEIN_INTAKE_INVALID', HttpStatus.BAD_REQUEST); }
}
