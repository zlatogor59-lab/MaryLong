import fs from 'node:fs/promises';
import { Prisma, PrismaClient } from '@prisma/client';

const apply = process.argv.includes('--apply');
const databaseUrl = new URL(process.env.DATABASE_URL || '');
if (!['localhost', '127.0.0.1'].includes(databaseUrl.hostname)) throw new Error('LOCAL_DATABASE_REQUIRED');

const names = new Set([
  'Молоко 1,5–2%', 'Молоко цельное', 'Йогурт натуральный нежирный',
  'Йогурт греческий натуральный', 'Творог зернёный / cottage cheese',
  'Сыр чеддер', 'Яйцо куриное, варёное',
]);
const allProfiles = JSON.parse(await fs.readFile(new URL('../docs/fat-profiles-v1.json', import.meta.url), 'utf8'));
const profiles = allProfiles.filter(profile => names.has(profile.name));
if (profiles.length !== names.size) throw new Error('DAIRY_EGGS_SOURCE_INCOMPLETE');

const fields = [
  'totalFatPer100g', 'saturatedFatPer100g', 'monounsaturatedFatPer100g',
  'polyunsaturatedFatPer100g', 'transFatPer100g', 'omega6TotalPer100g',
  'omega3TotalPer100g', 'fatProfileSource', 'fatProfileQuality',
];
const prisma = new PrismaClient();
try {
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('food-catalog-dairy-eggs-fat-sync-v1'))`;
    const rows = await tx.foodProductCard.findMany({
      where: { canonicalName: { in: [...names] }, status: 'verified' },
      select: Object.fromEntries(['id', 'canonicalName', ...fields].map(field => [field, true])),
    });
    if (rows.length !== names.size) throw new Error(`DAIRY_EGGS_TARGET_INCOMPLETE:${rows.length}`);
    const plan = [];
    for (const profile of profiles) {
      const row = rows.find(item => item.canonicalName === profile.name);
      const expected = {
        totalFatPer100g: profile.total, saturatedFatPer100g: profile.sfa,
        monounsaturatedFatPer100g: profile.mufa, polyunsaturatedFatPer100g: profile.pufa,
        transFatPer100g: profile.trans, omega6TotalPer100g: profile.omega6,
        omega3TotalPer100g: profile.omega3, fatProfileSource: profile.source,
        fatProfileQuality: profile.quality,
      };
      const exact = fields.every(field => {
        const actual = row[field];const wanted = expected[field];
        if (actual === null || wanted === null) return actual === wanted;
        return typeof wanted === 'number' ? Number(actual) === wanted : actual === wanted;
      });
      if (exact) { plan.push({ name: profile.name, action: 'skip' }); continue; }
      const populated = fields.filter(field => row[field] !== null);
      if (populated.length) throw new Error(`PARTIAL_FAT_PROFILE_CONFLICT:${profile.name}:${populated.join(',')}`);
      plan.push({ name: profile.name, action: 'update', id: row.id });
    }
    if (!apply) return { mode: 'dry_run', plan };
    const updated = [];
    for (const item of plan.filter(item => item.action === 'update')) {
      const profile = profiles.find(candidate => candidate.name === item.name);
      await tx.foodProductCard.update({ where: { id: item.id }, data: {
        totalFatPer100g: profile.total, saturatedFatPer100g: profile.sfa,
        monounsaturatedFatPer100g: profile.mufa, polyunsaturatedFatPer100g: profile.pufa,
        transFatPer100g: profile.trans, omega6TotalPer100g: profile.omega6,
        omega3TotalPer100g: profile.omega3, fatProfileSource: profile.source,
        fatProfileQuality: profile.quality, version: { increment: 1 },
      }});
      updated.push(item.name);
    }
    return { mode: 'apply', updated, skipped: plan.filter(item => item.action === 'skip').map(item => item.name) };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  console.log(JSON.stringify(result));
} finally {
  await prisma.$disconnect();
}
