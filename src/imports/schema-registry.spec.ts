import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CsvParserService } from './csv-parser.service';
import { consentVerified, identifySchema } from './schema-registry';

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

  it('recognises v3 with the optional email column appended by Google Forms', () => {
    const csv = new CsvParserService().parseSingleResponse(readFileSync('test/fixtures/consultant-cloud-v2-synthetic.csv'));
    const currentHeaders = [...csv.headers];
    currentHeaders[2] = 'Номер телефона с кодом страны, например +380…';
    currentHeaders[46] = 'Как вас найти в Telegram?';
    expect(identifySchema([...currentHeaders, 'Электронная почта, если вы ею пользуетесь'])).toBe('forms_v3_77_columns');
  });

  it('keeps consent verification positional when optional email is blank', () => {
    expect(consentVerified('forms_v3_77_columns', [...valuesWith('Да'), ''])).toBe(true);
  });

  it('recognises the exported synthetic v3 row with an empty email', () => {
    const csv = new CsvParserService().parseSingleResponse(readFileSync('test/fixtures/consultant-cloud-v3-empty-email-synthetic.csv'));
    expect(csv.headers).toHaveLength(77);
    expect(csv.values).toHaveLength(77);
    expect(csv.values[76]).toBe('');
    expect(identifySchema(csv.headers)).toBe('forms_v3_77_columns');
    expect(consentVerified('forms_v3_77_columns', csv.values)).toBe(true);
  });
});
