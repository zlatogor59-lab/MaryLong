import { describe, expect, it } from 'vitest';
import { parseFoodEnrichmentProfile } from './food-enrichment-profile';

describe('food enrichment profile', () => {
  it('never infers fortification for a generic product', () => {
    expect(parseFoodEnrichmentProfile({ status: 'confirmed_fortified', evidenceBasis: 'label', identityScope: 'generic',
      marketCountries: [], nutrients: { vitamin_d: { addedPer100g: 1, unit: 'ug', sourceName: 'Label', sourceVersion: '1' } } }).status).toBe('unknown');
  });
  it('accepts an exact labelled fortified product with versioned amounts', () => {
    expect(parseFoodEnrichmentProfile({ status: 'confirmed_fortified', evidenceBasis: 'label', identityScope: 'exact_product',
      marketCountries: ['UA'], nutrients: { vitamin_d: { addedPer100g: 1.5, unit: 'ug', sourceName: 'Фото этикетки', sourceVersion: '2026-09-12', sourceReference: 'front/back' } } }))
      .toMatchObject({ status: 'confirmed_fortified', nutrients: { vitamin_d: { addedPer100g: 1.5, unit: 'ug' } } });
  });
  it('requires a market for a regional category rule', () => {
    expect(parseFoodEnrichmentProfile({ status: 'confirmed_fortified', evidenceBasis: 'regional_mandate', identityScope: 'regional_category', marketCountries: [],
      nutrients: { folate: { addedPer100g: 10, unit: 'ug', sourceName: 'Rule', sourceVersion: '2026' } } }).status).toBe('unknown');
  });
  it('does not accept a fortified flag without a quantified nutrient', () => {
    expect(parseFoodEnrichmentProfile({ status: 'confirmed_fortified', evidenceBasis: 'label', identityScope: 'exact_product', marketCountries: [], nutrients: {} }).status).toBe('unknown');
  });
  it('keeps a confirmed exact non-fortified product distinct from unknown', () => {
    expect(parseFoodEnrichmentProfile({ status: 'confirmed_not_fortified', evidenceBasis: 'label', identityScope: 'exact_product', marketCountries: [], nutrients: {} }).status).toBe('confirmed_not_fortified');
  });
  it('degrades malformed stored data to unknown instead of throwing', () => {
    expect(parseFoodEnrichmentProfile({ status: 'yes' })).toMatchObject({ status: 'unknown', evidenceBasis: 'none' });
  });
});
