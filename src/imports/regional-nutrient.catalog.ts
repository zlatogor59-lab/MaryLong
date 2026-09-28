import type { NutrientKey, NutrientSourceValue } from './regional-nutrient.calculator';

const COFID_URL = 'https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid';
const FINELI_URL = 'https://fineli.fi/fineli/en/index';

type CofidEvidence = 'samples' | 'calculated' | 'literature' | 'trace';
type CofidCard = {
  code: string;
  selenium: number | null;
  iodine: number | null;
  seleniumEvidence: CofidEvidence;
  iodineEvidence: CofidEvidence;
};

// Values are µg/100 g from CoFID 2021. Null means that the source did not
// provide a usable value; it must never be converted to zero.
const cofidCards: CofidCard[] = [
  { code: '11-788', selenium: 3, iodine: 0, seleniumEvidence: 'samples', iodineEvidence: 'trace' },
  { code: '12-313', selenium: 1, iodine: 30, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '12-596', selenium: 1, iodine: 31, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '14-318', selenium: 0, iodine: 3, seleniumEvidence: 'trace', iodineEvidence: 'samples' },
  { code: '14-319', selenium: 0, iodine: 4, seleniumEvidence: 'trace', iodineEvidence: 'samples' },
  { code: '11-006', selenium: 9, iodine: null, seleniumEvidence: 'literature', iodineEvidence: 'literature' },
  { code: '18-323', selenium: 16, iodine: 7, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '18-356', selenium: 17, iodine: 8, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '18-008', selenium: 11, iodine: 15, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '12-379', selenium: 2, iodine: 34, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '12-555', selenium: 3, iodine: 39, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '12-539', selenium: 4, iodine: 24, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '12-346', selenium: 6, iodine: 30, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '12-940', selenium: 27, iodine: 52, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '16-373', selenium: 44, iodine: 161, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '17-038', selenium: 0, iodine: 0, seleniumEvidence: 'trace', iodineEvidence: 'trace' },
  { code: '13-517', selenium: 0, iodine: 2, seleniumEvidence: 'trace', iodineEvidence: 'samples' },
  { code: '13-523', selenium: 0, iodine: 3, seleniumEvidence: 'trace', iodineEvidence: 'samples' },
  { code: '13-524', selenium: 0, iodine: 3, seleniumEvidence: 'trace', iodineEvidence: 'samples' },
  { code: '13-503', selenium: 1, iodine: 2, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '13-513', selenium: 1, iodine: null, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '13-628', selenium: 0, iodine: 5, seleniumEvidence: 'trace', iodineEvidence: 'samples' },
  { code: '13-661', selenium: 18, iodine: 1, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '13-662', selenium: 29.9, iodine: 1, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '13-659', selenium: 2, iodine: 5, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '14-896', selenium: 4, iodine: 2, seleniumEvidence: 'literature', iodineEvidence: 'literature' },
  { code: '14-879', selenium: 3, iodine: 9, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '14-842', selenium: 6, iodine: null, seleniumEvidence: 'literature', iodineEvidence: 'literature' },
  { code: '14-845', selenium: 49, iodine: null, seleniumEvidence: 'literature', iodineEvidence: 'literature' },
  { code: '14-844', selenium: null, iodine: null, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '11-858', selenium: 5, iodine: 0, seleniumEvidence: 'samples', iodineEvidence: 'trace' },
  { code: '11-981', selenium: 7, iodine: null, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '11-1129', selenium: 11, iodine: 0, seleniumEvidence: 'calculated', iodineEvidence: 'trace' },
  { code: '13-490', selenium: 0, iodine: 1, seleniumEvidence: 'trace', iodineEvidence: 'samples' },
  { code: '13-582', selenium: 1, iodine: 2, seleniumEvidence: 'calculated', iodineEvidence: 'calculated' },
  { code: '13-497', selenium: 0, iodine: 0, seleniumEvidence: 'trace', iodineEvidence: 'trace' },
  { code: '13-521', selenium: 5, iodine: 4, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '13-499', selenium: 0, iodine: 2, seleniumEvidence: 'trace', iodineEvidence: 'samples' },
  { code: '13-244', selenium: 2, iodine: 3, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '14-327', selenium: 0, iodine: 1, seleniumEvidence: 'trace', iodineEvidence: 'samples' },
  { code: '14-324', selenium: 0, iodine: 1, seleniumEvidence: 'trace', iodineEvidence: 'samples' },
  { code: '14-325', selenium: 0, iodine: 2, seleniumEvidence: 'trace', iodineEvidence: 'samples' },
  { code: '14-321', selenium: 0, iodine: 1, seleniumEvidence: 'trace', iodineEvidence: 'samples' },
  { code: '16-359', selenium: 20, iodine: 14, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '16-394', selenium: 60, iodine: 35, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '16-176', selenium: 46, iodine: 38, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '16-416', selenium: 69, iodine: 12, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '16-389', selenium: 30, iodine: 12, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '16-390', selenium: 66, iodine: 247, seleniumEvidence: 'samples', iodineEvidence: 'samples' },
  { code: '16-263', selenium: 66, iodine: 20, seleniumEvidence: 'literature', iodineEvidence: 'literature' },
];

function card(code: string, nutrient: NutrientKey, value: number, evidence: CofidEvidence): NutrientSourceValue {
  const trace = evidence === 'trace';
  return {
    foodKey: code,
    nutrient,
    unit: 'ug',
    per100g: { low: value, central: value, high: value },
    sourceDataset: 'CoFID 2021',
    sourceCountry: 'GB',
    sourceVersion: '2021',
    datasetTier: 'fallback',
    valueType: evidence === 'literature' ? 'borrowed' : evidence === 'calculated' ? 'calculated' : evidence === 'samples' ? 'analytical' : 'trace',
    confidence: 'low',
    uncertaintyReason: trace
      ? `CoFID сообщает следовое значение; перенос на другой рынок не подтверждён. ${COFID_URL}`
      : evidence === 'calculated'
        ? `Расчётное значение CoFID используется вне британского рынка как резерв. ${COFID_URL}`
        : `Значение CoFID используется вне британского рынка как резерв. ${COFID_URL}`,
  };
}

export const regionalNutrientCatalog: NutrientSourceValue[] = cofidCards.flatMap(item => {
  const out: NutrientSourceValue[] = [];
  if (item.selenium !== null) out.push(card(item.code, 'selenium', item.selenium, item.seleniumEvidence));
  if (item.iodine !== null) out.push(card(item.code, 'iodine', item.iodine, item.iodineEvidence));
  return out;
}).concat([
  categoryCard('generic_marine_fish', 'selenium', [20, 35, 70], 20),
  categoryCard('generic_marine_fish', 'iodine', [10, 30, 200], 21),
  categoryCard('generic_freshwater_fish', 'selenium', [10, 19, 25], 4),
  categoryCard('generic_freshwater_fish', 'iodine', [1, 4, 16], 4),
  categoryCard('generic_fish', 'selenium', [10, 32, 70], 24),
  categoryCard('generic_fish', 'iodine', [1, 25, 200], 25),
]);

function categoryCard(
  foodKey: 'generic_fish' | 'generic_marine_fish' | 'generic_freshwater_fish',
  nutrient: NutrientKey,
  range: [number, number, number],
  basisRecordCount: number,
): NutrientSourceValue {
  const category = foodKey === 'generic_marine_fish' ? 'морской рыбы'
    : foodKey === 'generic_freshwater_fish' ? 'пресноводной рыбы' : 'рыбы неизвестного вида';
  return {
    foodKey,
    nutrient,
    unit: 'ug',
    per100g: { low: range[0], central: range[1], high: range[2] },
    sourceDataset: 'CoFID 2021 + Fineli',
    sourceCountry: null,
    sourceVersion: '2021–2026',
    datasetTier: 'regional',
    valueType: 'category_estimate',
    confidence: 'low',
    uncertaintyReason: `Диапазон для ${category}: округлённые 10-й перцентиль, медиана и 90-й перцентиль сопоставимых записей на 100 г. Вид, место вылова и происхождение не указаны.`,
    basisRecordCount,
    basisMethod: 'one comparable unbreaded, unsalted record per species where available; rounded P10/median/P90',
    sourceReferences: [COFID_URL, FINELI_URL],
  };
}

export function cofidFoodKey(sourceLabel: string | null | undefined): string | null {
  const match = /(?:^|[;\s])(?:CoFID\s*)?(\d{2}-\d{3})(?:$|[;\s])/i.exec(sourceLabel ?? '');
  return match?.[1] ?? null;
}
