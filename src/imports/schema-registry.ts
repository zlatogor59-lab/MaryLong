import { createHash } from 'node:crypto';

export type SchemaId = 'forms_v1_49_columns' | 'forms_v2_76_columns';
const schemas = new Map<string, SchemaId>([
  ['614e57efdc0bb2c30eb93081df529c57a5727b15e4e9adda5a72e72949b370dc', 'forms_v1_49_columns'],
  ['23af83387ff42b95cda5edb10302cad3e22bf9360112bf7ca669b798c51cda17', 'forms_v2_76_columns'],
]);

export const headerFingerprint = (headers: string[]) => createHash('sha256').update(JSON.stringify(headers), 'utf8').digest('hex');
export const identifySchema = (headers: string[]): SchemaId | null => schemas.get(headerFingerprint(headers)) ?? null;

export const consentVerified = (schemaId: SchemaId, values: unknown[]): boolean => {
  if (schemaId === 'forms_v1_49_columns') return false;
  const value = String(values[49] ?? '').trim().toLocaleLowerCase('uk-UA');
  return ['так', 'да', 'yes', 'погоджуюсь', 'согласен', 'согласна'].includes(value);
};
