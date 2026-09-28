import { describe, expect, it } from 'vitest';
import { calculateB12FolateProfessionalFact } from './b12-folate-professional-facts.calculator';

const assessment = (overrides: Record<string, unknown> = {}): any => ({
  nutrient: 'vitamin_b12',
  totalKnownUg: 3,
  knownTotalIsLowerEstimate: false,
  targetUg: 2.4,
  percentOfTarget: 125,
  status: 'working_target_met',
  completeness: { naturalCoveragePercent: 100, enrichmentCoveragePercent: 100, sufficient: true },
  ...overrides,
});

describe('B12 and folate professional facts quality gate', () => {
  it('publishes a neutral target comparison only after the gate passes', () => {
    const result = calculateB12FolateProfessionalFact(assessment());
    expect(result.quality_gate).toMatchObject({ status: 'passed', target_comparison_published: true });
    expect(result.facts.map((fact) => fact.code)).toEqual(['known_food_intake', 'working_target_comparison']);
  });

  it('allows the target comparison when reference coverage is sufficient without label data', () => {
    const result = calculateB12FolateProfessionalFact(assessment({
      totalKnownUg: 2,
      percentOfTarget: 83.3,
      status: 'below_working_target',
      completeness: { naturalCoveragePercent: 100, enrichmentCoveragePercent: 0, sufficient: true },
    }));
    expect(result.quality_gate).toMatchObject({ status: 'passed', target_comparison_published: true });
    expect(result.quality_gate.reasons).toEqual([]);
    expect(result.facts.map((fact) => fact.code)).toEqual(['known_food_intake', 'working_target_comparison']);
  });

  it('does not produce diagnoses, directives, or recommendations', () => {
    const text = JSON.stringify(calculateB12FolateProfessionalFact(assessment())).toLowerCase();
    for (const forbidden of ['диагноз', 'дефицит', 'вам нужно', 'следует', 'рекомендуем', 'назнач']) {
      expect(text).not.toContain(forbidden);
    }
  });
});
