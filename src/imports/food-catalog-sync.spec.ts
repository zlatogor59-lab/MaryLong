import { describe, expect, it } from 'vitest';
// @ts-expect-error The production CLI helper is intentionally plain ESM.
import { planFoodCatalogSync, sourceCode } from '../../scripts/lib/food-catalog-sync.mjs';

const source = (overrides: Record<string, unknown> = {}) => ({
  cofid_code: '16-389',
  name_ru: 'Креветки',
  ...overrides,
});

describe('food catalog sync planning', () => {
  it('extracts only an explicit CoFID identity from a source label', () => {
    expect(sourceCode('CoFID 2021; 16-389')).toBe('16-389');
    expect(sourceCode('Local card')).toBeNull();
  });

  it('plans only a missing card for creation', () => {
    const item = source();
    expect(planFoodCatalogSync([item], [])).toEqual({ creates: [item], skips: [], conflicts: [] });
  });

  it('skips an exact existing identity without overwriting it', () => {
    const plan = planFoodCatalogSync([source()], [
      { id: '1', canonicalName: 'Креветки', sourceLabel: 'CoFID 2021; 16-389' },
    ]);
    expect(plan).toMatchObject({ creates: [], conflicts: [], skips: [{ id: '1' }] });
  });

  it('blocks a name or source-code identity mismatch', () => {
    const plan = planFoodCatalogSync([source()], [
      { id: '1', canonicalName: 'Другой продукт', sourceLabel: 'CoFID 2021; 16-389' },
    ]);
    expect(plan.conflicts).toEqual([{ code: '16-389', name: 'Креветки', reason: 'IDENTITY_MISMATCH' }]);
    expect(plan.creates).toHaveLength(0);
  });

  it('blocks multiple matching existing cards', () => {
    const plan = planFoodCatalogSync([source()], [
      { id: '1', canonicalName: 'Креветки', sourceLabel: 'CoFID 2021; 16-389' },
      { id: '2', canonicalName: 'Креветки', sourceLabel: 'Imported; 16-389' },
    ]);
    expect(plan.conflicts[0].reason).toBe('MULTIPLE_EXISTING_MATCHES');
  });
});
