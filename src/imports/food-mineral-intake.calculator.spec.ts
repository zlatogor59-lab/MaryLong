import { describe, expect, it } from 'vitest';
import {
  calculateFoodMineralIntake,
  FoodMineralCard,
  FoodMineralKey,
  MineralUnit,
  MineralValueStatus,
} from './food-mineral-intake.calculator';

const card = (
  foodKey: string,
  nutrient: FoodMineralKey,
  valuePer100g: number | null,
  unit: MineralUnit = 'mg',
  status: MineralValueStatus = 'analytical',
): FoodMineralCard => ({
  foodKey,
  displayName: foodKey,
  nutrients: {
    [nutrient]: {
      valuePer100g,
      unit,
      status,
      sourceName: 'CoFID',
      sourceVersion: '2021',
      sourceRecord: foodKey,
    },
  },
});

describe('food mineral intake', () => {
  it('calculates the edible portion and converts source units', () => {
    const result = calculateFoodMineralIntake(
      'copper',
      [{ foodKey: 'fish', grossMassG: 150, edibleFraction: 0.68 }],
      [card('fish', 'copper', 200, 'ug')],
      { value: 0.9, unit: 'mg' },
    );
    expect(result.lines[0]).toMatchObject({ edibleMassG: 102, amount: 0.204, unit: 'mg' });
    expect(result.total).toBe(0.204);
    expect(result.percentOfTarget).toBe(22.7);
    expect(result.status).toBe('markedly_below_target');
  });

  it('does not turn a missing value into zero', () => {
    const result = calculateFoodMineralIntake(
      'magnesium',
      [{ foodKey: 'known', grossMassG: 100 }, { foodKey: 'missing', grossMassG: 100 }],
      [card('known', 'magnesium', 50), card('missing', 'magnesium', null, 'mg', 'missing')],
      { value: 320, unit: 'mg' },
    );
    expect(result.total).toBe(50);
    expect(result.unresolved[0].reason).toBe('VALUE_MISSING');
    expect(result.knownTotalIsLowerEstimate).toBe(true);
    expect(result.status).toBe('insufficient_data');
    expect(result.percentOfTarget).toBeNull();
  });

  it('keeps trace separate from a measured zero while counting it as covered', () => {
    const result = calculateFoodMineralIntake(
      'iron',
      [{ foodKey: 'trace', grossMassG: 80 }],
      [card('trace', 'iron', null, 'mg', 'trace')],
      { value: 18, unit: 'mg' },
    );
    expect(result.lines[0]).toMatchObject({ amount: 0, valueStatus: 'trace' });
    expect(result.completeness).toMatchObject({ rowCoveragePercent: 100, massCoveragePercent: 100, sufficient: true });
    expect(result.status).toBe('markedly_below_target');
  });

  it.each([
    [69.9, 'markedly_below_target'],
    [70, 'below_target'],
    [89.9, 'below_target'],
    [90, 'close_to_target'],
    [99.9, 'close_to_target'],
    [100, 'target_met_or_above'],
  ] as const)('applies the neutral target band at %s percent', (percent, expected) => {
    const result = calculateFoodMineralIntake(
      'zinc',
      [{ foodKey: 'food', grossMassG: 100 }],
      [card('food', 'zinc', percent)],
      { value: 100, unit: 'mg' },
    );
    expect(result.status).toBe(expected);
    expect(result.clientRecommendationGenerated).toBe(false);
    expect(result.consultantFact.toLowerCase()).not.toMatch(/дефицит|лечени|назнач/);
  });

  it('blocks interpretation when the edible fraction is invalid', () => {
    const result = calculateFoodMineralIntake(
      'iron',
      [{ foodKey: 'food', grossMassG: 100, edibleFraction: 1.2 }],
      [card('food', 'iron', 10)],
      { value: 18, unit: 'mg' },
    );
    expect(result.unresolved[0].reason).toBe('EDIBLE_FRACTION_INVALID');
    expect(result.status).toBe('insufficient_data');
  });

  it('keeps a valid known total but blocks the target signal below the coverage gate', () => {
    const result = calculateFoodMineralIntake(
      'magnesium',
      [
        { foodKey: 'known', grossMassG: 60 },
        { foodKey: 'missing', grossMassG: 40 },
      ],
      [card('known', 'magnesium', 100)],
      { value: 320, unit: 'mg', minimumCoveragePercent: 70 },
    );
    expect(result.total).toBe(60);
    expect(result.completeness).toMatchObject({ rowCoveragePercent: 50, massCoveragePercent: 60, sufficient: false });
    expect(result.percentOfTarget).toBeNull();
    expect(result.status).toBe('insufficient_data');
  });
});
