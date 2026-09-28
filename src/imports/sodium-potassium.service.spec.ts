import { describe, expect, it } from 'vitest';
import { SodiumPotassiumService } from './sodium-potassium.service';

const mineral = (nutrient: string) => ({
  source_intake_version: 3,
  assessment: {
    total: nutrient === 'sodium' ? 1441.7 : 2938.5,
    completeness: { sufficient: true, rowCoveragePercent: 100, massCoveragePercent: 100 },
    lines: [{ foodKey: 'food', amount: 1 }],
    unresolved: [],
  },
});

describe('sodium and potassium service', () => {
  it('combines food totals and keeps unknown added salt as an unresolved lower bound', async () => {
    const service = new SodiumPotassiumService(
      { get: async (_s: string, _c: string, _u: unknown, nutrient: string) => mineral(nutrient) } as never,
      { get: async () => ({ salt_coffee_items: [{ catalog_key: 'SC-SALT-UNSPECIFIED', amount_unknown: true }] }) } as never,
    );
    const result = await service.get('submission', 'client', {} as never);
    expect(result).toMatchObject({
      source_intake_version: 3,
      assessment: {
        sodium: { amountMg: 1441.7, status: 'lower_bound', knownTotalIsLowerEstimate: true },
        potassium: { amountMg: { low: 2938.5, high: 2938.5 }, status: 'below_target' },
        priority: 'potassium_below_target',
      },
    });
  });

  it('returns no assessment before a saved intake exists', async () => {
    const service = new SodiumPotassiumService(
      { get: async () => ({ source_intake_version: 0, assessment: null }) } as never,
      { get: async () => ({ salt_coffee_items: [] }) } as never,
    );
    expect(await service.get('submission', 'client', {} as never)).toMatchObject({ source_intake_version: 0, assessment: null });
  });

  it('adds sodium from quantitatively recorded salt to the food total', async () => {
    const service = new SodiumPotassiumService(
      { get: async (_s: string, _c: string, _u: unknown, nutrient: string) => mineral(nutrient) } as never,
      { get: async () => ({
        salt_coffee_items: [{ catalog_key: 'SC-SALT-UNSPECIFIED', mass_g: 2 }],
        salt_coffee: { totals: { sodium_lower_estimate_mg: 786 } },
      }) } as never,
    );
    const result = await service.get('submission', 'client', {} as never);
    expect(result).toMatchObject({
      assessment: { sodium: { amountMg: 2227.7, status: 'above_target', knownTotalIsLowerEstimate: false } },
      contributors: { added_salt_sodium_mg: 786 },
    });
  });
});
