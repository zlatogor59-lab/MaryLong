import { describe, expect, it } from 'vitest';
import { calculateSodiumPotassium } from './sodium-potassium.calculator';

const calculate = (overrides: Partial<Parameters<typeof calculateSodiumPotassium>[0]> = {}) =>
  calculateSodiumPotassium({
    sodiumMg: 1800,
    sodiumCoverageSufficient: true,
    addedSaltUnknown: false,
    potassiumMg: { low: 3700, high: 3700 },
    potassiumCoverageSufficient: true,
    ...overrides,
  });

describe('sodium and potassium calculator', () => {
  it('scenario 1 keeps both values within their working targets without a priority', () => {
    const result = calculate();
    expect(result.sodium).toMatchObject({ status: 'within_target', saltEquivalentG: 4.5 });
    expect(result.potassium.status).toBe('target_met');
    expect(result.priority).toBeNull();
  });

  it('scenario 2 creates one isolated sodium priority', () => {
    const result = calculate({ sodiumMg: 2400, potassiumMg: { low: 3800, high: 3800 } });
    expect(result.sodium).toMatchObject({ status: 'above_target', saltEquivalentG: 6 });
    expect(result.potassium.status).toBe('target_met');
    expect(result.priority).toBe('sodium_above_target');
  });

  it('scenario 3 creates one isolated potassium priority without calling it a deficiency', () => {
    const result = calculate({ potassiumMg: { low: 2800, high: 2800 } });
    expect(result.potassium.status).toBe('below_target');
    expect(result.priority).toBe('potassium_below_target');
    expect(JSON.stringify(result)).not.toMatch(/deficien|дефицит/i);
  });

  it('scenario 4 combines high sodium and low potassium into one priority', () => {
    const result = calculate({ sodiumMg: 2500, potassiumMg: { low: 2600, high: 2600 } });
    expect(result.sodium.status).toBe('above_target');
    expect(result.potassium.status).toBe('below_target');
    expect(result.priority).toBe('combined_sodium_high_potassium_low');
  });

  it('scenario 5 preserves unknown salt as a lower bound without inventing an amount', () => {
    const result = calculate({ sodiumMg: 1500, addedSaltUnknown: true });
    expect(result.sodium).toMatchObject({
      status: 'lower_bound',
      amountMg: 1500,
      saltEquivalentG: 3.75,
      knownTotalIsLowerEstimate: true,
    });
    expect(result.priority).toBeNull();
  });

  it('scenario 6 preserves a reliable sodium result when potassium data are insufficient', () => {
    const result = calculate({
      sodiumMg: 2200,
      potassiumMg: null,
      potassiumCoverageSufficient: false,
    });
    expect(result.sodium.status).toBe('above_target');
    expect(result.potassium.status).toBe('insufficient_data');
    expect(result.priority).toBe('sodium_above_target');
  });

  it('scenario 7 separates the safety signal and blocks automatic potassium interpretation', () => {
    const result = calculate({
      potassiumMg: { low: 3800, high: 3800 },
      medicalOrMedicationContext: true,
    });
    expect(result.sodium.status).toBe('within_target');
    expect(result.potassium).toMatchObject({ status: 'target_met', clientInterpretationBlocked: true });
    expect(result.priority).toBeNull();
    expect(result.safetySignal).toBe('medical_or_potassium_context_requires_review');
  });

  it('confirms an above-target lower bound when known sodium already exceeds the target', () => {
    const result = calculate({ sodiumMg: 2100, addedSaltUnknown: true });
    expect(result.sodium.status).toBe('above_target_lower_bound');
    expect(result.priority).toBe('sodium_above_target');
  });

  it('uses the lactation potassium target and leaves sweating as context only', () => {
    const result = calculate({
      potassiumMg: { low: 3800, high: 3800 },
      potassiumTargetMg: 4000,
      sweatingContext: true,
    });
    expect(result.potassium).toMatchObject({ targetMg: 4000, status: 'below_target' });
    expect(result.sweatingContext).toBe(true);
    expect(result.sodium.targetMg).toBe(2000);
  });

  it('marks a range crossing the potassium target as a boundary', () => {
    expect(calculate({ potassiumMg: { low: 3300, high: 3600 } }).potassium.status).toBe('boundary');
  });
});
