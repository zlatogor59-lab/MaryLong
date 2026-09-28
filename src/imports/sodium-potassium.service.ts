import { Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { FoodMineralIntakeService } from './food-mineral-intake.service';
import { ProteinIntakeService } from './protein-intake.service';
import { calculateSodiumPotassium } from './sodium-potassium.calculator';

@Injectable()
export class SodiumPotassiumService {
  constructor(
    private readonly foodMinerals: FoodMineralIntakeService,
    private readonly intake: ProteinIntakeService,
  ) {}

  async get(submissionId: string, clientId: string, user: AuthenticatedUser, potassiumTargetMg = 3500) {
    const [sodium, potassium, intake] = await Promise.all([
      this.foodMinerals.get(submissionId, clientId, user, 'sodium', 2000, 'mg'),
      this.foodMinerals.get(submissionId, clientId, user, 'potassium', potassiumTargetMg, 'mg'),
      this.intake.get(submissionId, clientId, user),
    ]);
    const sodiumAssessment = sodium.assessment;
    const potassiumAssessment = potassium.assessment;
    if (!sodiumAssessment || !potassiumAssessment) {
      return {
        submission_id: submissionId,
        source_intake_version: 0,
        assessment: null,
      };
    }
    const saltItems = intake.salt_coffee_items ?? [];
    const addedSaltUnknown = saltItems.some((item: any) =>
      String(item.catalog_key ?? '').startsWith('SC-SALT-') && item.amount_unknown === true,
    );
    const addedSaltSodiumMg = Number(intake.salt_coffee?.totals?.sodium_lower_estimate_mg ?? 0);
    const sodiumMg = sodiumAssessment.total + addedSaltSodiumMg;
    const assessment = calculateSodiumPotassium({
      sodiumMg,
      sodiumCoverageSufficient: sodiumAssessment.completeness.sufficient,
      addedSaltUnknown,
      potassiumMg: { low: potassiumAssessment.total, high: potassiumAssessment.total },
      potassiumCoverageSufficient: potassiumAssessment.completeness.sufficient,
      potassiumTargetMg,
    });
    return {
      submission_id: submissionId,
      source_intake_version: Math.max(sodium.source_intake_version, potassium.source_intake_version),
      assessment,
      completeness: {
        sodium: sodiumAssessment.completeness,
        potassium: potassiumAssessment.completeness,
      },
      contributors: {
        sodium: sodiumAssessment.lines,
        added_salt_sodium_mg: addedSaltSodiumMg,
        potassium: potassiumAssessment.lines,
      },
      unresolved: {
        sodium: sodiumAssessment.unresolved,
        potassium: potassiumAssessment.unresolved,
      },
    };
  }
}
