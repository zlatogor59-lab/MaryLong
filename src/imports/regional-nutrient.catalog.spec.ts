import { describe, expect, it } from 'vitest';
import { cofidFoodKey, regionalNutrientCatalog } from './regional-nutrient.catalog';
import { selectRegionalNutrientSource } from './regional-nutrient.calculator';

describe('regional nutrient catalog', () => {
  it('extracts a CoFID code from the verified product source label', () => {
    expect(cofidFoodKey('CoFID 2021; 16-373')).toBe('16-373');
    expect(cofidFoodKey('Local source')).toBeNull();
  });

  it('keeps a missing iodine value missing instead of creating zero', () => {
    expect(selectRegionalNutrientSource('UA', '11-006', 'iodine', regionalNutrientCatalog)).toBeNull();
  });

  it('marks fallback and trace provenance explicitly', () => {
    expect(selectRegionalNutrientSource('BG', '14-318', 'selenium', regionalNutrientCatalog)).toMatchObject({
      datasetTier: 'fallback',
      valueType: 'trace',
      confidence: 'low',
      sourceCountry: 'GB',
    });
  });

  it('contains both selenium and iodine cards for the verified cod entry', () => {
    expect(selectRegionalNutrientSource('UA', '16-373', 'selenium', regionalNutrientCatalog)?.per100g.central).toBe(44);
    expect(selectRegionalNutrientSource('UA', '16-373', 'iodine', regionalNutrientCatalog)?.per100g.central).toBe(161);
  });

  it('uses broad category ranges for fish of unknown species', () => {
    expect(selectRegionalNutrientSource('UA', 'generic_marine_fish', 'iodine', regionalNutrientCatalog)).toMatchObject({
      per100g: { low: 10, central: 30, high: 200 },
      valueType: 'category_estimate',
      confidence: 'low',
      basisRecordCount: 21,
    });
    expect(selectRegionalNutrientSource('BG', 'generic_freshwater_fish', 'selenium', regionalNutrientCatalog)?.per100g)
      .toEqual({ low: 10, central: 19, high: 25 });
  });

  it('never substitutes the exact cod value for generic fish', () => {
    const generic = selectRegionalNutrientSource('UA', 'generic_fish', 'selenium', regionalNutrientCatalog);
    expect(generic?.per100g).toEqual({ low: 10, central: 32, high: 70 });
    expect(generic?.per100g.central).not.toBe(44);
  });

  it.each([
    ['12-596', 1, 31],
    ['12-555', 3, 39],
    ['12-539', 4, 24],
    ['12-346', 6, 30],
    ['12-940', 27, 52],
  ])('contains audited selenium and iodine for CoFID %s', (code, selenium, iodine) => {
    expect(selectRegionalNutrientSource('UA', code, 'selenium', regionalNutrientCatalog)?.per100g.central).toBe(selenium);
    expect(selectRegionalNutrientSource('UA', code, 'iodine', regionalNutrientCatalog)?.per100g.central).toBe(iodine);
  });

  it.each([
    ['18-323', 16, 7],
    ['18-356', 17, 8],
    ['18-008', 11, 15],
  ])('contains audited meat and poultry values for CoFID %s', (code, selenium, iodine) => {
    expect(selectRegionalNutrientSource('BG', code, 'selenium', regionalNutrientCatalog)?.per100g.central).toBe(selenium);
    expect(selectRegionalNutrientSource('BG', code, 'iodine', regionalNutrientCatalog)?.per100g.central).toBe(iodine);
  });

  it.each([
    ['13-503', 1, 2],
    ['13-517', 0, 2],
    ['13-523', 0, 3],
    ['13-524', 0, 3],
    ['13-513', 1, null],
    ['13-628', 0, 5],
  ])('contains audited vegetable values for CoFID %s', (code, selenium, iodine) => {
    expect(selectRegionalNutrientSource('UA', code, 'selenium', regionalNutrientCatalog)?.per100g.central).toBe(selenium);
    const iodineCard = selectRegionalNutrientSource('UA', code, 'iodine', regionalNutrientCatalog);
    if (iodine === null) expect(iodineCard).toBeNull();
    else expect(iodineCard?.per100g.central).toBe(iodine);
  });

  it('tracks trace evidence separately for each nutrient', () => {
    expect(selectRegionalNutrientSource('UA', '13-517', 'selenium', regionalNutrientCatalog)?.valueType).toBe('trace');
    expect(selectRegionalNutrientSource('UA', '13-517', 'iodine', regionalNutrientCatalog)?.valueType).toBe('analytical');
    expect(selectRegionalNutrientSource('UA', '11-788', 'iodine', regionalNutrientCatalog)?.valueType).toBe('trace');
    expect(selectRegionalNutrientSource('UA', '11-788', 'selenium', regionalNutrientCatalog)?.valueType).toBe('analytical');
  });

  it.each([
    ['14-318', 0, 3],
    ['14-319', 0, 4],
  ])('contains audited fruit values for CoFID %s', (code, selenium, iodine) => {
    expect(selectRegionalNutrientSource('BG', code, 'selenium', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: selenium },
      valueType: 'trace',
    });
    expect(selectRegionalNutrientSource('BG', code, 'iodine', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: iodine },
      valueType: 'analytical',
    });
  });

  it('preserves the distinct evidence and missing values for cereals', () => {
    expect(selectRegionalNutrientSource('UA', '11-788', 'selenium', regionalNutrientCatalog)?.per100g.central).toBe(3);
    expect(selectRegionalNutrientSource('UA', '11-788', 'iodine', regionalNutrientCatalog)?.valueType).toBe('trace');
    expect(selectRegionalNutrientSource('UA', '11-006', 'selenium', regionalNutrientCatalog)?.valueType).toBe('borrowed');
    expect(selectRegionalNutrientSource('UA', '11-006', 'iodine', regionalNutrientCatalog)).toBeNull();
  });

  it('keeps both olive-oil micronutrients as source-reported traces', () => {
    expect(selectRegionalNutrientSource('UA', '17-038', 'selenium', regionalNutrientCatalog)?.valueType).toBe('trace');
    expect(selectRegionalNutrientSource('UA', '17-038', 'iodine', regionalNutrientCatalog)?.valueType).toBe('trace');
  });

  it.each([
    ['13-661', 18, 1],
    ['13-662', 29.9, 1],
    ['13-659', 2, 5],
  ])('contains audited cooked legume values for CoFID %s', (code, selenium, iodine) => {
    expect(selectRegionalNutrientSource('UA', code, 'selenium', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: selenium },
      valueType: 'analytical',
    });
    expect(selectRegionalNutrientSource('UA', code, 'iodine', regionalNutrientCatalog)?.per100g.central).toBe(iodine);
  });

  it.each([
    ['14-896', 4, 2, 'borrowed'],
    ['14-879', 3, 9, 'analytical'],
  ])('contains audited nut values for CoFID %s', (code, selenium, iodine, valueType) => {
    expect(selectRegionalNutrientSource('BG', code, 'selenium', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: selenium },
      valueType,
    });
    expect(selectRegionalNutrientSource('BG', code, 'iodine', regionalNutrientCatalog)?.per100g.central).toBe(iodine);
  });

  it('keeps missing iodine and sesame values unresolved', () => {
    expect(selectRegionalNutrientSource('UA', '14-842', 'selenium', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: 6 },
      valueType: 'borrowed',
    });
    expect(selectRegionalNutrientSource('UA', '14-845', 'selenium', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: 49 },
      valueType: 'borrowed',
    });
    expect(selectRegionalNutrientSource('UA', '14-842', 'iodine', regionalNutrientCatalog)).toBeNull();
    expect(selectRegionalNutrientSource('UA', '14-845', 'iodine', regionalNutrientCatalog)).toBeNull();
    expect(selectRegionalNutrientSource('UA', '14-844', 'selenium', regionalNutrientCatalog)).toBeNull();
    expect(selectRegionalNutrientSource('UA', '14-844', 'iodine', regionalNutrientCatalog)).toBeNull();
  });

  it.each([
    ['11-858', 5, 0, 'analytical', 'trace'],
    ['11-981', 7, null, 'analytical', null],
    ['11-1129', 11, 0, 'calculated', 'trace'],
  ])('contains audited cereal values for CoFID %s', (code, selenium, iodine, seleniumType, iodineType) => {
    expect(selectRegionalNutrientSource('UA', code, 'selenium', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: selenium },
      valueType: seleniumType,
    });
    const iodineCard = selectRegionalNutrientSource('UA', code, 'iodine', regionalNutrientCatalog);
    if (iodine === null) expect(iodineCard).toBeNull();
    else expect(iodineCard).toMatchObject({ per100g: { central: iodine }, valueType: iodineType });
  });

  it.each([
    ['13-490', 0, 1, 'trace', 'analytical'],
    ['13-582', 1, 2, 'calculated', 'calculated'],
    ['13-497', 0, 0, 'trace', 'trace'],
    ['13-521', 5, 4, 'analytical', 'analytical'],
    ['13-499', 0, 2, 'trace', 'analytical'],
    ['13-244', 2, 3, 'analytical', 'analytical'],
  ])('contains audited additional vegetable values for CoFID %s', (code, selenium, iodine, seleniumType, iodineType) => {
    expect(selectRegionalNutrientSource('BG', code, 'selenium', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: selenium },
      valueType: seleniumType,
    });
    expect(selectRegionalNutrientSource('BG', code, 'iodine', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: iodine },
      valueType: iodineType,
    });
  });

  it.each([
    ['14-327', 1],
    ['14-324', 1],
    ['14-325', 2],
    ['14-321', 1],
  ])('keeps trace selenium separate from measured iodine for fruit CoFID %s', (code, iodine) => {
    expect(selectRegionalNutrientSource('UA', code, 'selenium', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: 0 },
      valueType: 'trace',
    });
    expect(selectRegionalNutrientSource('UA', code, 'iodine', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: iodine },
      valueType: 'analytical',
    });
  });

  it.each([
    ['16-359', 20, 14],
    ['16-394', 60, 35],
    ['16-176', 46, 38],
    ['16-416', 69, 12],
  ])('contains audited exact fish values for CoFID %s', (code, selenium, iodine) => {
    expect(selectRegionalNutrientSource('UA', code, 'selenium', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: selenium },
      valueType: 'analytical',
    });
    expect(selectRegionalNutrientSource('UA', code, 'iodine', regionalNutrientCatalog)?.per100g.central).toBe(iodine);
  });

  it.each([
    ['16-389', 30, 12, 'analytical'],
    ['16-390', 66, 247, 'analytical'],
    ['16-263', 66, 20, 'borrowed'],
  ])('contains source-ready seafood values for CoFID %s', (code, selenium, iodine, valueType) => {
    expect(selectRegionalNutrientSource('BG', code, 'selenium', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: selenium },
      valueType,
    });
    expect(selectRegionalNutrientSource('BG', code, 'iodine', regionalNutrientCatalog)).toMatchObject({
      per100g: { central: iodine },
      valueType,
    });
  });
});
