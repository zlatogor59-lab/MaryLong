import { describe, expect, it } from 'vitest';
import { consentVerified } from './schema-registry';

describe('consent verification', () => {
  const valuesWith = (consent: string) => {
    const values = Array(76).fill('synthetic');
    values[49] = consent;
    return values;
  };

  it.each(['Так', 'Да', 'YES', 'Погоджуюсь', 'Згоден', 'Згодна', 'Согласен', 'Согласна', 'Согласен(на)'])(
    'accepts an explicit v2 consent value: %s',
    (consent) => expect(consentVerified('forms_v2_76_columns', valuesWith(consent))).toBe(true),
  );

  it('does not infer consent from an unknown value', () => {
    expect(consentVerified('forms_v2_76_columns', valuesWith('synthetic'))).toBe(false);
  });

  it('keeps historical v1 blocked even if a value resembles consent', () => {
    expect(consentVerified('forms_v1_49_columns', valuesWith('yes'))).toBe(false);
  });
});
