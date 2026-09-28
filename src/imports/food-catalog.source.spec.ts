import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readJson = (path: string) => JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
const catalog = readJson('data/food-catalog/catalog-payload.json');
const carbohydrate = readJson('docs/carbohydrate-quality-cofid-v1.json');
const fatProfiles = readJson('docs/fat-profiles-v1.json');

const seafood = [
  { code: '16-389', name: 'Креветки королевские, готовые', protein: 16.2, fat: 0.4 },
  { code: '16-390', name: 'Мидии, готовые', protein: 17.7, fat: 2.2 },
  { code: '16-263', name: 'Кальмар, сырой', protein: 15.4, fat: 1.7 },
];

const dairyAndEggs = [
  { code: '12-313', name: 'Молоко 1,5–2%', fat: 1.7 },
  { code: '12-596', name: 'Молоко цельное', fat: 3.6 },
  { code: '12-379', name: 'Йогурт натуральный нежирный', fat: 1.0 },
  { code: '12-555', name: 'Йогурт греческий натуральный', fat: 10.2 },
  { code: '12-539', name: 'Творог зернёный / cottage cheese', fat: 6.0 },
  { code: '12-346', name: 'Сыр чеддер', fat: 34.9 },
  { code: '12-940', name: 'Яйцо куриное, варёное', fat: 9.6 },
];

describe('source food catalog', () => {
  it.each(seafood)('contains one complete seafood card for $code', expected => {
    const rows = catalog.products.filter((item: any) => item.cofid_code === expected.code);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name_ru: expected.name,
      category: 'Морепродукты',
      protein_g: expected.protein,
      fat_g: expected.fat,
      known_nutrients: 19,
      missing_fields: '',
    });
  });

  it.each(seafood)('has one matching carbohydrate profile for $code', expected => {
    expect(carbohydrate.products.filter((item: any) => item.cofid_code === expected.code)).toHaveLength(1);
  });

  it.each(seafood)('has one matching fat profile for $name', expected => {
    const rows = fatProfiles.filter((item: any) => item.name === expected.name);
    expect(rows).toHaveLength(1);
    expect(rows[0].total).toBe(expected.fat);
  });

  it.each(dairyAndEggs)('has one matching CoFID card and fat profile for $code', expected => {
    expect(catalog.products.filter((item: any) => item.cofid_code === expected.code)).toHaveLength(1);
    const profiles = fatProfiles.filter((item: any) => item.name === expected.name);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].total).toBe(expected.fat);
    expect(profiles[0].source).toContain(expected.code);
  });

  it('keeps product identifiers unique', () => {
    const ids = catalog.products.map((item: any) => item.product_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
