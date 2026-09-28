export type FoodMineralKey = 'calcium' | 'phosphorus' | 'magnesium' | 'iron' | 'zinc' | 'copper' | 'manganese' | 'molybdenum' | 'sodium' | 'potassium';
export type MineralUnit = 'mg' | 'ug';
export type MineralValueStatus = 'analytical' | 'calculated' | 'borrowed' | 'trace' | 'missing';
export type MineralIntakeStatus =
  | 'not_assessed'
  | 'insufficient_data'
  | 'markedly_below_target'
  | 'below_target'
  | 'close_to_target'
  | 'target_met_or_above';

export type FoodMineralValue = {
  valuePer100g: number | null;
  unit: MineralUnit;
  status: MineralValueStatus;
  sourceName: string;
  sourceVersion: string;
  sourceRecord: string | null;
};

export type FoodMineralCard = {
  foodKey: string;
  displayName: string;
  nutrients: Partial<Record<FoodMineralKey, FoodMineralValue>>;
};

export type FoodMineralPortion = {
  foodKey: string;
  grossMassG: number;
  edibleFraction?: number;
};

export type FoodMineralTarget = {
  value: number | null;
  unit: MineralUnit;
  minimumCoveragePercent?: number;
};

const round = (value: number, digits = 3) => Number(value.toFixed(digits));

function convert(value: number, from: MineralUnit, to: MineralUnit): number {
  if (from === to) return value;
  return from === 'mg' ? value * 1000 : value / 1000;
}

function validKnownValue(value: FoodMineralValue): boolean {
  if (value.status === 'missing') return value.valuePer100g === null;
  if (value.status === 'trace') return value.valuePer100g === null || value.valuePer100g === 0;
  return value.valuePer100g !== null && Number.isFinite(value.valuePer100g) && value.valuePer100g >= 0;
}

export function calculateFoodMineralIntake(
  nutrient: FoodMineralKey,
  portions: FoodMineralPortion[],
  cards: FoodMineralCard[],
  target: FoodMineralTarget,
) {
  const cardByKey = new Map(cards.map(card => [card.foodKey, card]));
  const lines: Array<{
    foodKey: string;
    displayName: string;
    grossMassG: number;
    edibleMassG: number;
    amount: number;
    unit: MineralUnit;
    valueStatus: Exclude<MineralValueStatus, 'missing'>;
    sourceName: string;
    sourceVersion: string;
    sourceRecord: string | null;
  }> = [];
  const unresolved: Array<FoodMineralPortion & {
    reason: 'MASS_INVALID' | 'EDIBLE_FRACTION_INVALID' | 'CARD_NOT_FOUND' | 'VALUE_MISSING' | 'VALUE_INVALID';
  }> = [];

  let validEdibleMassG = 0;
  let resolvedEdibleMassG = 0;

  for (const portion of portions) {
    if (!Number.isFinite(portion.grossMassG) || portion.grossMassG <= 0 || portion.grossMassG > 5000) {
      unresolved.push({ ...portion, reason: 'MASS_INVALID' });
      continue;
    }
    const edibleFraction = portion.edibleFraction ?? 1;
    if (!Number.isFinite(edibleFraction) || edibleFraction <= 0 || edibleFraction > 1) {
      unresolved.push({ ...portion, reason: 'EDIBLE_FRACTION_INVALID' });
      continue;
    }
    const edibleMassG = portion.grossMassG * edibleFraction;
    validEdibleMassG += edibleMassG;
    const card = cardByKey.get(portion.foodKey);
    if (!card) {
      unresolved.push({ ...portion, reason: 'CARD_NOT_FOUND' });
      continue;
    }
    const value = card.nutrients[nutrient];
    if (!value || value.status === 'missing') {
      unresolved.push({ ...portion, reason: 'VALUE_MISSING' });
      continue;
    }
    if (!validKnownValue(value)) {
      unresolved.push({ ...portion, reason: 'VALUE_INVALID' });
      continue;
    }

    const per100g = value.status === 'trace' ? 0 : Number(value.valuePer100g);
    const amount = convert(per100g * edibleMassG / 100, value.unit, target.unit);
    resolvedEdibleMassG += edibleMassG;
    lines.push({
      foodKey: portion.foodKey,
      displayName: card.displayName,
      grossMassG: round(portion.grossMassG),
      edibleMassG: round(edibleMassG),
      amount: round(amount),
      unit: target.unit,
      valueStatus: value.status,
      sourceName: value.sourceName,
      sourceVersion: value.sourceVersion,
      sourceRecord: value.sourceRecord,
    });
  }

  const total = round(lines.reduce((sum, line) => sum + line.amount, 0));
  const rowCoveragePercent = portions.length ? round(lines.length / portions.length * 100, 1) : 0;
  const massCoveragePercent = validEdibleMassG ? round(resolvedEdibleMassG / validEdibleMassG * 100, 1) : 0;
  const minimumCoveragePercent = target.minimumCoveragePercent ?? 70;
  const coverageSufficient = portions.length > 0
    && unresolved.every(item => item.reason !== 'MASS_INVALID' && item.reason !== 'EDIBLE_FRACTION_INVALID')
    && rowCoveragePercent >= minimumCoveragePercent
    && massCoveragePercent >= minimumCoveragePercent;
  const targetValid = target.value !== null && Number.isFinite(target.value) && target.value > 0;
  const percentOfTarget = coverageSufficient && targetValid ? round(total / Number(target.value) * 100, 1) : null;

  let status: MineralIntakeStatus = 'not_assessed';
  if (portions.length && !coverageSufficient) status = 'insufficient_data';
  else if (percentOfTarget !== null && percentOfTarget < 70) status = 'markedly_below_target';
  else if (percentOfTarget !== null && percentOfTarget < 90) status = 'below_target';
  else if (percentOfTarget !== null && percentOfTarget < 100) status = 'close_to_target';
  else if (percentOfTarget !== null) status = 'target_met_or_above';

  const consultantFact = status === 'markedly_below_target'
    ? 'Расчётное поступление с пищей существенно ниже рабочего ориентира.'
    : status === 'below_target'
      ? 'Расчётное поступление с пищей ниже рабочего ориентира.'
      : status === 'close_to_target'
        ? 'Расчётное поступление с пищей близко к рабочему ориентиру.'
        : status === 'target_met_or_above'
          ? 'Рабочий ориентир расчётного поступления с пищей достигнут.'
          : status === 'insufficient_data'
            ? 'Для надёжного сравнения с рабочим ориентиром недостаточно пищевых данных.'
            : 'Сравнение с рабочим ориентиром не выполнено.';

  return {
    nutrient,
    unit: target.unit,
    lines,
    unresolved,
    total,
    knownTotalIsLowerEstimate: unresolved.length > 0,
    completeness: {
      rowCoveragePercent,
      massCoveragePercent,
      minimumCoveragePercent,
      sufficient: coverageSufficient,
    },
    target: target.value,
    percentOfTarget,
    status,
    consultantFact,
    clientRecommendationGenerated: false,
  };
}
