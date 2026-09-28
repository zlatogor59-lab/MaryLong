export type SodiumStatus =
  | 'within_target'
  | 'above_target'
  | 'lower_bound'
  | 'above_target_lower_bound'
  | 'insufficient_data';

export type PotassiumStatus =
  | 'target_met'
  | 'below_target'
  | 'boundary'
  | 'insufficient_data';

export type SodiumPotassiumInput = {
  sodiumMg: number | null;
  sodiumCoverageSufficient: boolean;
  addedSaltUnknown: boolean;
  potassiumMg: { low: number; high: number } | null;
  potassiumCoverageSufficient: boolean;
  sodiumTargetMg?: number;
  potassiumTargetMg?: number;
  medicalOrMedicationContext?: boolean;
  potassiumSaltSubstitute?: boolean;
  sweatingContext?: boolean;
};

export type SodiumPotassiumPriority =
  | 'combined_sodium_high_potassium_low'
  | 'sodium_above_target'
  | 'potassium_below_target'
  | 'insufficient_data'
  | null;

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

export function calculateSodiumPotassium(input: SodiumPotassiumInput) {
  const sodiumTargetMg = input.sodiumTargetMg ?? 2000;
  const potassiumTargetMg = input.potassiumTargetMg ?? 3500;
  const sodiumKnown = input.sodiumMg !== null
    && Number.isFinite(input.sodiumMg)
    && input.sodiumMg >= 0;
  const potassiumKnown = input.potassiumMg !== null
    && Number.isFinite(input.potassiumMg.low)
    && Number.isFinite(input.potassiumMg.high)
    && input.potassiumMg.low >= 0
    && input.potassiumMg.high >= input.potassiumMg.low;

  let sodiumStatus: SodiumStatus = 'insufficient_data';
  if (sodiumKnown && input.sodiumCoverageSufficient) {
    if (input.addedSaltUnknown) {
      sodiumStatus = Number(input.sodiumMg) > sodiumTargetMg
        ? 'above_target_lower_bound'
        : 'lower_bound';
    } else {
      sodiumStatus = Number(input.sodiumMg) > sodiumTargetMg
        ? 'above_target'
        : 'within_target';
    }
  }

  let potassiumStatus: PotassiumStatus = 'insufficient_data';
  if (potassiumKnown && input.potassiumCoverageSufficient) {
    if (input.potassiumMg!.low >= potassiumTargetMg) potassiumStatus = 'target_met';
    else if (input.potassiumMg!.high < potassiumTargetMg) potassiumStatus = 'below_target';
    else potassiumStatus = 'boundary';
  }

  const sodiumAbove = sodiumStatus === 'above_target' || sodiumStatus === 'above_target_lower_bound';
  let priority: SodiumPotassiumPriority = null;
  if (sodiumStatus === 'insufficient_data' && potassiumStatus === 'insufficient_data') priority = 'insufficient_data';
  else if (sodiumAbove && potassiumStatus === 'below_target') priority = 'combined_sodium_high_potassium_low';
  else if (sodiumAbove) priority = 'sodium_above_target';
  else if (potassiumStatus === 'below_target') priority = 'potassium_below_target';

  const safetyBlocked = Boolean(input.medicalOrMedicationContext || input.potassiumSaltSubstitute);
  const sodiumMg = sodiumKnown ? round(Number(input.sodiumMg)) : null;
  const potassiumMg = potassiumKnown
    ? { low: round(input.potassiumMg!.low), high: round(input.potassiumMg!.high) }
    : null;
  const ratio = sodiumStatus !== 'insufficient_data'
    && sodiumStatus !== 'lower_bound'
    && potassiumStatus !== 'insufficient_data'
    && potassiumMg
    && potassiumMg.low === potassiumMg.high
    && potassiumMg.low > 0
      ? round(Number(sodiumMg) / potassiumMg.low, 3)
      : null;

  return {
    sodium: {
      amountMg: sodiumMg,
      saltEquivalentG: sodiumMg === null ? null : round(sodiumMg * 2.5 / 1000),
      targetMg: sodiumTargetMg,
      status: sodiumStatus,
      knownTotalIsLowerEstimate: input.addedSaltUnknown && sodiumKnown,
      coverageSufficient: input.sodiumCoverageSufficient,
    },
    potassium: {
      amountMg: potassiumMg,
      targetMg: potassiumTargetMg,
      status: potassiumStatus,
      coverageSufficient: input.potassiumCoverageSufficient,
      clientInterpretationBlocked: safetyBlocked,
    },
    sodiumPotassiumRatio: ratio,
    priority,
    safetySignal: safetyBlocked ? 'medical_or_potassium_context_requires_review' : null,
    sweatingContext: Boolean(input.sweatingContext),
    clientRecommendationGenerated: false,
  };
}
