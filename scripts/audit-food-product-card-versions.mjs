import {PrismaClient} from '@prisma/client';

const prisma=new PrismaClient();
try{
  const issues=await prisma.$queryRaw`
    WITH version_stats AS (
      SELECT card_id, count(*)::int AS snapshot_count, min(version)::int AS min_version,
             max(version)::int AS max_version, count(DISTINCT version)::int AS distinct_versions
      FROM food_product_card_versions GROUP BY card_id
    )
    SELECT c.id, c.canonical_name AS "canonicalName", c.version AS "cardVersion",
           COALESCE(v.snapshot_count,0) AS "snapshotCount",
           v.min_version AS "minVersion", v.max_version AS "maxVersion",
           CASE
             WHEN v.card_id IS NULL THEN 'MISSING_SNAPSHOTS'
             WHEN v.max_version<>c.version OR v.snapshot_count<>(v.max_version-v.min_version+1) OR v.distinct_versions<>v.snapshot_count THEN 'NON_CONTIGUOUS_VERSIONS'
             ELSE 'UNKNOWN'
           END AS issue
    FROM food_product_cards c LEFT JOIN version_stats v ON v.card_id=c.id
    WHERE v.card_id IS NULL OR v.max_version<>c.version OR v.snapshot_count<>(v.max_version-v.min_version+1) OR v.distinct_versions<>v.snapshot_count
    ORDER BY c.canonical_name`;
  const orphanCount=await prisma.$queryRaw`SELECT count(*)::int AS count FROM food_product_card_versions v LEFT JOIN food_product_cards c ON c.id=v.card_id WHERE c.id IS NULL`;
  const result={ok:issues.length===0&&orphanCount[0].count===0,cardsChecked:await prisma.foodProductCard.count(),issues,orphanSnapshots:orphanCount[0].count};
  console.log(JSON.stringify(result,null,2));
  if(!result.ok)process.exitCode=1;
}finally{await prisma.$disconnect();}
