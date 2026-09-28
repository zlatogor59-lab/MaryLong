export type EnrichmentStatus = 'confirmed_fortified' | 'confirmed_not_fortified' | 'unknown';
export type EnrichmentEvidenceBasis = 'label' | 'exact_product_record' | 'regional_mandate' | 'none';
export type EnrichmentIdentityScope = 'exact_product' | 'regional_category' | 'generic';
export type EnrichedNutrientUnit = 'mg' | 'ug';

export type EnrichedNutrientValue = {
  addedPer100g: number;
  unit: EnrichedNutrientUnit;
  sourceName: string;
  sourceVersion: string;
  sourceReference: string | null;
};

export type FoodEnrichmentProfile = {
  status: EnrichmentStatus;
  evidenceBasis: EnrichmentEvidenceBasis;
  identityScope: EnrichmentIdentityScope;
  marketCountries: string[];
  nutrients: Record<string, EnrichedNutrientValue>;
  limitation: string | null;
};

export const unknownFoodEnrichmentProfile = (limitation = 'Обогащение не подтверждено для точного продукта.'):
FoodEnrichmentProfile => ({
  status: 'unknown',
  evidenceBasis: 'none',
  identityScope: 'generic',
  marketCountries: [],
  nutrients: {},
  limitation,
});

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export function parseFoodEnrichmentProfile(value: unknown): FoodEnrichmentProfile {
  if (!isObject(value)) return unknownFoodEnrichmentProfile();
  const status = value.status;
  const evidenceBasis = value.evidenceBasis;
  const identityScope = value.identityScope;
  if (!['confirmed_fortified', 'confirmed_not_fortified', 'unknown'].includes(String(status))
    || !['label', 'exact_product_record', 'regional_mandate', 'none'].includes(String(evidenceBasis))
    || !['exact_product', 'regional_category', 'generic'].includes(String(identityScope))) {
    return unknownFoodEnrichmentProfile('Профиль обогащения повреждён или имеет неизвестную версию.');
  }
  const markets = Array.isArray(value.marketCountries)
    ? value.marketCountries.filter(item => typeof item === 'string' && /^[A-Z]{2}$/.test(item))
    : [];
  const nutrients: Record<string, EnrichedNutrientValue> = {};
  if (isObject(value.nutrients)) for (const [key, raw] of Object.entries(value.nutrients)) {
    if (!/^[a-z][a-z0-9_]{1,39}$/.test(key) || !isObject(raw)) continue;
    const amount = Number(raw.addedPer100g);
    if (!Number.isFinite(amount) || amount <= 0 || !['mg', 'ug'].includes(String(raw.unit))
      || typeof raw.sourceName !== 'string' || !raw.sourceName.trim()
      || typeof raw.sourceVersion !== 'string' || !raw.sourceVersion.trim()) continue;
    nutrients[key] = { addedPer100g: amount, unit: raw.unit as EnrichedNutrientUnit,
      sourceName: raw.sourceName.trim(), sourceVersion: raw.sourceVersion.trim(),
      sourceReference: typeof raw.sourceReference === 'string' && raw.sourceReference.trim() ? raw.sourceReference.trim() : null };
  }
  const normalized: FoodEnrichmentProfile = { status: status as EnrichmentStatus,
    evidenceBasis: evidenceBasis as EnrichmentEvidenceBasis, identityScope: identityScope as EnrichmentIdentityScope,
    marketCountries: [...new Set(markets)], nutrients,
    limitation: typeof value.limitation === 'string' && value.limitation.trim() ? value.limitation.trim() : null };
  if (normalized.status === 'unknown') return unknownFoodEnrichmentProfile(normalized.limitation ?? undefined);
  if (normalized.identityScope === 'generic' || normalized.evidenceBasis === 'none')
    return unknownFoodEnrichmentProfile('Общий продукт нельзя считать обогащённым или необогащённым без доказательства.');
  if (normalized.evidenceBasis === 'regional_mandate' && normalized.identityScope !== 'regional_category')
    return unknownFoodEnrichmentProfile('Региональное правило применимо только к региональной категории продукта.');
  if (normalized.identityScope === 'regional_category' && !normalized.marketCountries.length)
    return unknownFoodEnrichmentProfile('Для региональной категории не указана страна рынка.');
  if (normalized.status === 'confirmed_fortified' && !Object.keys(normalized.nutrients).length)
    return unknownFoodEnrichmentProfile('Обогащение отмечено, но количество добавленных нутриентов не подтверждено.');
  if (normalized.status === 'confirmed_not_fortified' && Object.keys(normalized.nutrients).length)
    return unknownFoodEnrichmentProfile('Профиль одновременно отрицает обогащение и содержит добавленные нутриенты.');
  return normalized;
}
