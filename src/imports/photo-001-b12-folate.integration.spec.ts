import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { unknownFoodEnrichmentProfile } from './food-enrichment-profile';
import { calculateB12FolateIntake } from './b12-folate-intake.calculator';
// @ts-expect-error Production catalog helper is intentionally plain ESM.
import { buildFoodVitaminProfile } from '../../scripts/lib/food-vitamin-profile.mjs';

describe('PHOTO-001 B12 and folate source path', () => {
  it('reproduces the documented ration while preserving missing, trace, and unknown enrichment', () => {
    const root = path.resolve(__dirname, '../../data/food-catalog');
    const source = JSON.parse(fs.readFileSync(path.join(root, 'photo-payload.json'), 'utf8'));
    const ration = JSON.parse(fs.readFileSync(path.join(root, 'photo-macro-analysis.json'), 'utf8'));
    const cards = source.products.map((product: any) => {
      const profile = buildFoodVitaminProfile(product);
      return {
        foodKey: product.product_id,
        displayName: product.name_ru,
        values: {
          vitamin_b12: profile.vitamin_b12,
          folate: profile.folate,
        },
        enrichmentProfile: unknownFoodEnrichmentProfile(),
      };
    });

    const result = calculateB12FolateIntake(
      ration.rows.map((row: any) => ({ foodKey: row.product_id, massG: Number(row.grams) })),
      cards,
    );

    expect(result.vitamin_b12).toMatchObject({
      totalKnownUg: 8.23,
      status: 'working_target_met',
      knownTotalIsLowerEstimate: true,
      deficiencyConclusionGenerated: false,
      clientRecommendationGenerated: false,
      completeness: { naturalCoveragePercent: 94.2, enrichmentCoveragePercent: 0, sufficient: true },
    });
    expect(result.folate).toMatchObject({
      totalKnownUg: 318.57,
      status: 'below_working_target',
      knownTotalIsLowerEstimate: false,
      deficiencyConclusionGenerated: false,
      clientRecommendationGenerated: false,
      completeness: { naturalCoveragePercent: 100, enrichmentCoveragePercent: 0, sufficient: true },
    });
    expect(result.vitamin_b12.unresolved.filter((x: any) => x.reason === 'NATURAL_VALUE_MISSING')).toHaveLength(1);
    expect(result.folate.lines.filter((x: any) => x.naturalUg === 0)).toHaveLength(2);
  });
});
