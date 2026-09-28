import fs from 'node:fs/promises';
import { Prisma, PrismaClient } from '@prisma/client';
import { createData, planFoodCatalogSync } from './lib/food-catalog-sync.mjs';

const apply = process.argv.includes('--apply');
const databaseUrl = new URL(process.env.DATABASE_URL || '');
if (!['localhost', '127.0.0.1'].includes(databaseUrl.hostname)) throw new Error('LOCAL_DATABASE_REQUIRED');

const wantedCodes = new Set(['16-389', '16-390', '16-263']);
const catalog = JSON.parse(await fs.readFile(new URL('../../tmp/fooddata-research/catalog-payload.json', import.meta.url), 'utf8'));
const carbohydrates = JSON.parse(await fs.readFile(new URL('../docs/carbohydrate-quality-cofid-v1.json', import.meta.url), 'utf8'));
const fats = JSON.parse(await fs.readFile(new URL('../docs/fat-profiles-v1.json', import.meta.url), 'utf8'));
const sourceProducts = catalog.products.filter(product => wantedCodes.has(product.cofid_code));
if (sourceProducts.length !== wantedCodes.size) throw new Error('SEAFOOD_SOURCE_INCOMPLETE');

const prisma = new PrismaClient();
try {
  const result = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('food-catalog-seafood-sync-v1'))`;
    const existing = await tx.foodProductCard.findMany({
      where: { OR: sourceProducts.flatMap(product => [
        { canonicalName: product.name_ru },
        { sourceLabel: { contains: product.cofid_code } },
      ]) },
      select: { id: true, canonicalName: true, sourceLabel: true },
    });
    const plan = planFoodCatalogSync(sourceProducts, existing);
    if (plan.conflicts.length) throw new Error(`FOOD_CATALOG_CONFLICT:${JSON.stringify(plan.conflicts)}`);
    if (!apply) return { mode: 'dry_run', create: plan.creates.map(x => x.cofid_code), skip: plan.skips };

    const verifier = await tx.user.findFirst({ where: { role: 'admin', status: 'active' }, select: { id: true } });
    if (!verifier) throw new Error('ACTIVE_ADMIN_REQUIRED');
    const created = [];
    for (const source of plan.creates) {
      const carbohydrate = carbohydrates.products.find(item => item.cofid_code === source.cofid_code);
      const fat = fats.find(item => item.name === source.name_ru);
      if (!carbohydrate || !fat) throw new Error(`SEAFOOD_PROFILE_INCOMPLETE:${source.cofid_code}`);
      const row = await tx.foodProductCard.create({ data: createData(source, carbohydrate, fat, verifier.id), select: { id: true } });
      created.push({ code: source.cofid_code, id: row.id });
    }
    return { mode: 'apply', created, skipped: plan.skips };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  console.log(JSON.stringify(result));
} finally {
  await prisma.$disconnect();
}
