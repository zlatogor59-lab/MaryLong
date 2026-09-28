export type NutrientKey = 'selenium' | 'iodine';
export type Confidence = 'high' | 'medium' | 'low';
export type ValueType = 'analytical' | 'calculated' | 'borrowed' | 'category_estimate' | 'trace' | 'label';
export type DatasetTier = 'product_label' | 'national' | 'regional' | 'harmonized_eu' | 'fallback';

export type NutrientSourceValue = {
  foodKey: string;
  nutrient: NutrientKey;
  unit: 'ug';
  per100g: { low: number; central: number; high: number };
  sourceDataset: string;
  sourceCountry: string | null;
  sourceVersion: string;
  datasetTier: DatasetTier;
  valueType: ValueType;
  confidence: Confidence;
  uncertaintyReason: string | null;
  basisRecordCount?: number;
  basisMethod?: string;
  sourceReferences?: string[];
};

export type NutrientFoodInput = {
  foodKey: string;
  displayName: string;
  massG: number;
};

export type NutrientAssessmentOptions = {
  targetUg: number | null;
  upperLevelUg: number | null;
  period: 'single_day' | 'habitual';
};

const confidenceRank: Record<Confidence, number> = { high: 2, medium: 1, low: 0 };
const tierRank: Record<DatasetTier, number> = { product_label: 0, national: 1, regional: 2, harmonized_eu: 3, fallback: 4 };
const round = (value: number, digits = 2) => Number(value.toFixed(digits));

function isValidRange(value: NutrientSourceValue): boolean {
  const { low, central, high } = value.per100g;
  return [low, central, high].every(Number.isFinite) && low >= 0 && low <= central && central <= high;
}

/**
 * Selects a source for the recorded food only. Callers must map vague entries such
 * as "fish" to a generic category card; this function never promotes them to cod.
 */
export function selectRegionalNutrientSource(
  marketCountry: string,
  foodKey: string,
  nutrient: NutrientKey,
  candidates: NutrientSourceValue[],
): NutrientSourceValue | null {
  const suitable = candidates.filter(
    candidate => candidate.foodKey === foodKey && candidate.nutrient === nutrient && isValidRange(candidate),
  );

  return suitable.sort((left, right) => {
    const leftMarketRank = left.sourceCountry === marketCountry ? 0 : 1;
    const rightMarketRank = right.sourceCountry === marketCountry ? 0 : 1;
    return leftMarketRank - rightMarketRank
      || tierRank[left.datasetTier] - tierRank[right.datasetTier]
      || confidenceRank[right.confidence] - confidenceRank[left.confidence];
  })[0] ?? null;
}

export function calculateRegionalNutrientIntake(
  marketCountry: string,
  nutrient: NutrientKey,
  foods: NutrientFoodInput[],
  candidates: NutrientSourceValue[],
  options: NutrientAssessmentOptions,
) {
  const lines: Array<NutrientFoodInput & {
    source: NutrientSourceValue;
    amountUg: { low: number; central: number; high: number };
  }> = [];
  const unresolved: Array<NutrientFoodInput & { reason: 'MASS_INVALID' | 'SOURCE_NOT_FOUND' }> = [];

  for (const food of foods) {
    if (!Number.isFinite(food.massG) || food.massG <= 0 || food.massG > 5000) {
      unresolved.push({ ...food, reason: 'MASS_INVALID' });
      continue;
    }
    const source = selectRegionalNutrientSource(marketCountry, food.foodKey, nutrient, candidates);
    if (!source) {
      unresolved.push({ ...food, reason: 'SOURCE_NOT_FOUND' });
      continue;
    }
    const factor = food.massG / 100;
    lines.push({
      ...food,
      source,
      amountUg: {
        low: round(source.per100g.low * factor),
        central: round(source.per100g.central * factor),
        high: round(source.per100g.high * factor),
      },
    });
  }

  const total = {
    low: round(lines.reduce((sum, line) => sum + line.amountUg.low, 0)),
    central: round(lines.reduce((sum, line) => sum + line.amountUg.central, 0)),
    high: round(lines.reduce((sum, line) => sum + line.amountUg.high, 0)),
  };
  const confidence = lines.length
    ? lines.reduce<Confidence>((lowest, line) =>
        confidenceRank[line.source.confidence] < confidenceRank[lowest] ? line.source.confidence : lowest, 'high')
    : 'low';
  const complete = foods.length > 0 && unresolved.length === 0;
  const crossesTarget = options.targetUg !== null && total.low < options.targetUg && total.high >= options.targetUg;
  const crossesUpperLevel = options.upperLevelUg !== null && total.low <= options.upperLevelUg && total.high > options.upperLevelUg;
  const decisionBlockedByUncertainty = !complete || confidence === 'low' || crossesTarget || crossesUpperLevel;

  let status = 'not_assessed';
  if (!complete) status = 'insufficient_data';
  else if (crossesTarget || crossesUpperLevel) status = 'uncertain_boundary';
  else if (options.upperLevelUg !== null && total.low > options.upperLevelUg) status = 'above_upper_level_estimate';
  else if (options.targetUg !== null && total.high < options.targetUg * 0.7) status = 'markedly_below_target';
  else if (options.targetUg !== null && total.high < options.targetUg) status = 'below_target';
  else if (options.targetUg !== null && total.low >= options.targetUg) status = 'target_met_or_above';

  const interpretation = status === 'target_met_or_above'
    ? options.period === 'single_day'
      ? 'Расчёт выше ориентира за выбранный день; оцените повторяемость рациона и качество исходных данных.'
      : 'Расчёт достигает или превышает ориентир; интерпретируйте вместе с повторяемостью рациона и качеством данных.'
    : status === 'above_upper_level_estimate'
      ? 'Расчётная оценка выше применимого верхнего уровня; требуется проверка длительности, добавок и исходных данных консультантом.'
      : status === 'uncertain_boundary'
        ? 'Диапазон оценки пересекает порог решения; категоричный вывод заблокирован до уточнения данных.'
        : status === 'insufficient_data'
          ? 'Для части продуктов нет подходящих данных; итоговый вывод заблокирован.'
          : status === 'below_target' || status === 'markedly_below_target'
            ? 'Расчётная оценка ниже ориентира; для вывода оцените обычный рацион за несколько дней.'
            : 'Недостаточно параметров для сравнения с ориентиром.';

  return {
    marketCountry,
    nutrient,
    lines,
    unresolved,
    totalUg: total,
    completenessPercent: foods.length ? round(lines.length / foods.length * 100, 1) : 0,
    confidence,
    status,
    decisionBlockedByUncertainty,
    knownTotalIsLowerEstimate: unresolved.length > 0,
    interpretation,
  };
}
