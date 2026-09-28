import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { unknownFoodEnrichmentProfile } from './food-enrichment-profile';
import { calculateVitaminKIntake } from './vitamin-k-intake.calculator';
// @ts-expect-error Production helper is ESM.
import { buildFoodVitaminProfile } from '../../scripts/lib/food-vitamin-profile.mjs';

describe('PHOTO-001 vitamin K source path', () => {
  it('preserves the audited CoFID K1 values and blocks an incomplete comparison', () => {
    const root = path.resolve(__dirname, '../../../tmp/fooddata-research');
    const source = JSON.parse(fs.readFileSync(path.join(root, 'photo-payload.json'), 'utf8'));
    const ration = JSON.parse(fs.readFileSync(path.join(root, 'photo-macro-analysis.json'), 'utf8'));
    const profiles = source.products.map((product: any) => ({
      product,
      value: buildFoodVitaminProfile(product).vitamin_k,
    }));
    const cards = profiles.map(({ product, value }: any) => ({
      foodKey: product.product_id,
      displayName: product.name_ru,
      valuePer100g: value.valuePer100g,
      status: value.status,
      sourceName: value.sourceName,
      sourceVersion: value.sourceVersion,
      enrichmentProfile: unknownFoodEnrichmentProfile(),
    }));

    const result = calculateVitaminKIntake(
      ration.rows.map((row: any) => ({ foodKey: row.product_id, massG: Number(row.grams) })),
      cards,
    );

    expect(result).toMatchObject({
      totalKnownUg: 126.58,
      targetUg: 70,
      percentOfTarget: null,
      status: 'insufficient_data',
      knownTotalIsLowerEstimate: true,
      deficiencyConclusionGenerated: false,
      clientRecommendationGenerated: false,
      completeness: {
        naturalCoveragePercent: 32.4,
        enrichmentCoveragePercent: 0,
        sufficient: false,
      },
    });
    expect(profiles.filter(({ value }: any) => value.status === 'trace')).toHaveLength(0);
    expect(profiles.filter(({ value }: any) => value.status === 'missing')).toHaveLength(10);
    expect(result.lines).toHaveLength(9);
    expect(result.unresolved).toHaveLength(10);
    expect(result.lines.map((line: any) => line.displayName)).not.toContain('Яйца куриные, жареные без добавленного жира');
  });
});
