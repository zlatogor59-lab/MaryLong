import { describe, expect, it } from 'vitest';
import {
  calculateRegionalNutrientIntake,
  NutrientSourceValue,
  selectRegionalNutrientSource,
} from './regional-nutrient.calculator';

const source = (overrides: Partial<NutrientSourceValue> = {}): NutrientSourceValue => ({
  foodKey: 'generic_fish',
  nutrient: 'selenium',
  unit: 'ug',
  per100g: { low: 20, central: 35, high: 55 },
  sourceDataset: 'European category estimate',
  sourceCountry: null,
  sourceVersion: '1',
  datasetTier: 'harmonized_eu',
  valueType: 'category_estimate',
  confidence: 'low',
  uncertaintyReason: 'Вид рыбы не указан',
  ...overrides,
});

describe('regional nutrient source selection', () => {
  it('prefers the national source for the market of consumption', () => {
    const european = source();
    const bulgarian = source({ sourceDataset: 'Bulgarian FCDB', sourceCountry: 'BG', datasetTier: 'national', confidence: 'medium' });
    expect(selectRegionalNutrientSource('BG', 'generic_fish', 'selenium', [european, bulgarian]))
      .toMatchObject({ sourceDataset: 'Bulgarian FCDB' });
  });

  it('uses a regional source before a fallback', () => {
    const regional = source({ datasetTier: 'regional', sourceDataset: 'Neighbouring FCDB' });
    const fallback = source({ datasetTier: 'fallback', sourceDataset: 'CoFID' });
    expect(selectRegionalNutrientSource('UA', 'generic_fish', 'selenium', [fallback, regional]))
      .toMatchObject({ sourceDataset: 'Neighbouring FCDB' });
  });

  it('does not silently map generic fish to cod', () => {
    const cod = source({ foodKey: 'cod', confidence: 'high', valueType: 'analytical' });
    expect(selectRegionalNutrientSource('BG', 'generic_fish', 'selenium', [cod])).toBeNull();
  });

  it('rejects malformed ranges', () => {
    const malformed = source({ per100g: { low: 50, central: 30, high: 20 } });
    expect(selectRegionalNutrientSource('BG', 'generic_fish', 'selenium', [malformed])).toBeNull();
  });
});

describe('regional nutrient intake', () => {
  it('aggregates low, central and high estimates instead of false precision', () => {
    const result = calculateRegionalNutrientIntake(
      'BG',
      'selenium',
      [{ foodKey: 'generic_fish', displayName: 'Рыба', massG: 150 }],
      [source()],
      { targetUg: 70, upperLevelUg: 255, period: 'single_day' },
    );
    expect(result.totalUg).toEqual({ low: 30, central: 52.5, high: 82.5 });
    expect(result.status).toBe('uncertain_boundary');
    expect(result.decisionBlockedByUncertainty).toBe(true);
    expect(result.confidence).toBe('low');
  });

  it('uses neutral language when a one-day estimate exceeds the target', () => {
    const result = calculateRegionalNutrientIntake(
      'BG',
      'selenium',
      [{ foodKey: 'generic_fish', displayName: 'Рыба', massG: 200 }],
      [source({ per100g: { low: 40, central: 50, high: 60 }, confidence: 'medium' })],
      { targetUg: 70, upperLevelUg: 255, period: 'single_day' },
    );
    expect(result.status).toBe('target_met_or_above');
    expect(result.interpretation).toContain('выше ориентира за выбранный день');
    expect(result.interpretation).not.toContain('токсич');
  });

  it('blocks the conclusion when a product has no applicable source', () => {
    const result = calculateRegionalNutrientIntake(
      'UA',
      'iodine',
      [{ foodKey: 'unknown_yogurt', displayName: 'Йогурт', massG: 150 }],
      [],
      { targetUg: 150, upperLevelUg: 600, period: 'habitual' },
    );
    expect(result.status).toBe('insufficient_data');
    expect(result.completenessPercent).toBe(0);
    expect(result.unresolved[0].reason).toBe('SOURCE_NOT_FOUND');
    expect(result.knownTotalIsLowerEstimate).toBe(true);
  });

  it('marks an upper-level crossing as uncertain rather than declaring excess', () => {
    const result = calculateRegionalNutrientIntake(
      'UA',
      'iodine',
      [{ foodKey: 'generic_fish', displayName: 'Рыба', massG: 100 }],
      [source({ nutrient: 'iodine', per100g: { low: 400, central: 600, high: 800 } })],
      { targetUg: 150, upperLevelUg: 600, period: 'habitual' },
    );
    expect(result.status).toBe('uncertain_boundary');
    expect(result.decisionBlockedByUncertainty).toBe(true);
  });
});
