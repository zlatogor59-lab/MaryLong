const codePattern = /(?:^|[;\s])(?:CoFID\s*)?(\d{2}-\d{3})(?:$|[;\s])/i;

export function sourceCode(sourceLabel) {
  return codePattern.exec(sourceLabel ?? '')?.[1] ?? null;
}

export function planFoodCatalogSync(sourceProducts, existingProducts) {
  const creates = [];
  const skips = [];
  const conflicts = [];

  for (const source of sourceProducts) {
    const matches = existingProducts.filter(existing =>
      sourceCode(existing.sourceLabel) === source.cofid_code || existing.canonicalName === source.name_ru,
    );
    if (matches.length > 1) {
      conflicts.push({ code: source.cofid_code, name: source.name_ru, reason: 'MULTIPLE_EXISTING_MATCHES' });
      continue;
    }
    if (matches.length === 1) {
      const existing = matches[0];
      if (sourceCode(existing.sourceLabel) !== source.cofid_code || existing.canonicalName !== source.name_ru) {
        conflicts.push({ code: source.cofid_code, name: source.name_ru, reason: 'IDENTITY_MISMATCH' });
      } else {
        skips.push({ code: source.cofid_code, name: source.name_ru, id: existing.id });
      }
      continue;
    }
    creates.push(source);
  }
  return { creates, skips, conflicts };
}

export function createData(source, carbohydrate, fat, verifierId) {
  return {
    canonicalName: source.name_ru,
    proteinPer100g: source.protein_g,
    energyKcalPer100g: source.energy_kcal,
    carbohydratePer100g: source.carbohydrate_g,
    fibrePer100g: carbohydrate.aoac_fibre_g_per_100g,
    totalSugarsPer100g: carbohydrate.total_sugars_g_per_100g,
    freeSugarsPer100g: carbohydrate.free_sugars_g_per_100g,
    carbohydrateSourceClass: carbohydrate.carbohydrate_source_class,
    carbohydrateQualitySource: carbohydrate.source,
    totalFatPer100g: fat.total,
    saturatedFatPer100g: fat.sfa,
    monounsaturatedFatPer100g: fat.mufa,
    polyunsaturatedFatPer100g: fat.pufa,
    transFatPer100g: fat.trans,
    omega6TotalPer100g: fat.omega6,
    omega3TotalPer100g: fat.omega3,
    fatProfileSource: fat.source,
    fatProfileQuality: fat.quality,
    origin: 'animal',
    plantSharePercent: 0,
    sourceLabel: `${source.source}; ${source.cofid_code}`,
    sourceReference: source.source_url,
    status: 'verified',
    createdBy: verifierId,
    verifiedBy: verifierId,
    verifiedAt: new Date(),
  };
}
