import type { B12FolateKey } from './b12-folate-intake.calculator';

type VitaminAssessment = {
  nutrient: B12FolateKey;
  totalKnownUg: number;
  knownTotalIsLowerEstimate: boolean;
  targetUg: number;
  percentOfTarget: number | null;
  status: 'not_assessed' | 'insufficient_data' | 'below_working_target' | 'working_target_met';
  completeness: {
    naturalCoveragePercent: number;
    enrichmentCoveragePercent: number;
    sufficient: boolean;
  };
};

const names: Record<B12FolateKey, string> = {
  vitamin_b12: 'Витамин B12',
  folate: 'Фолат',
};

export function calculateB12FolateProfessionalFact(assessment: VitaminAssessment) {
  const assessed = assessment.status !== 'not_assessed';
  const gatePassed = assessed && assessment.completeness.sufficient && assessment.percentOfTarget !== null;
  const amountPrefix = assessment.knownTotalIsLowerEstimate ? 'не менее ' : '';
  const facts: Array<{ code: string; text: string; evidence: Record<string, unknown> }> = [];

  if (assessed) {
    facts.push({
      code: 'known_food_intake',
      text: `${names[assessment.nutrient]}: известное пищевое поступление — ${amountPrefix}${assessment.totalKnownUg} мкг.`,
      evidence: {
        total_known_ug: assessment.totalKnownUg,
        lower_estimate: assessment.knownTotalIsLowerEstimate,
      },
    });
  }

  if (gatePassed) {
    facts.push({
      code: 'working_target_comparison',
      text: assessment.status === 'below_working_target'
        ? `Расчётное пищевое поступление ниже рабочего ориентира ${assessment.targetUg} мкг.`
        : `Рабочий ориентир пищевого поступления ${assessment.targetUg} мкг достигнут.`,
      evidence: {
        target_ug: assessment.targetUg,
        percent_of_target: assessment.percentOfTarget,
        status: assessment.status,
      },
    });
  }

  const reasons = !assessed
    ? ['RATION_NOT_ASSESSED']
    : [
        assessment.completeness.naturalCoveragePercent < 70 ? 'NATURAL_COVERAGE_INSUFFICIENT' : null,
      ].filter((value): value is string => value !== null);

  return {
    nutrient: assessment.nutrient,
    assessment_basis: 'recorded_food_intake',
    basis_text: 'Основание — продукты и массы сохранённого рациона; расчёт не оценивает обеспеченность организма.',
    facts,
    quality_gate: {
      status: gatePassed ? 'passed' : 'blocked',
      reasons,
      natural_coverage_percent: assessment.completeness.naturalCoveragePercent,
      enrichment_coverage_percent: assessment.completeness.enrichmentCoveragePercent,
      target_comparison_published: gatePassed,
    },
    deficiency_conclusion_generated: false,
    client_recommendations_generated: false,
  };
}

export function calculateB12FolateProfessionalFacts(
  assessments: Record<B12FolateKey, VitaminAssessment>,
) {
  return Object.fromEntries(
    (['vitamin_b12', 'folate'] as B12FolateKey[]).map((key) => [
      key,
      calculateB12FolateProfessionalFact(assessments[key]),
    ]),
  );
}
