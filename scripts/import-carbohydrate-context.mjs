import fs from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
const url=new URL(process.env.DATABASE_URL||'');
if(!['localhost','127.0.0.1'].includes(url.hostname))throw new Error('LOCAL_DATABASE_REQUIRED');
const apply=process.argv.includes('--apply'),source=JSON.parse(await fs.readFile(new URL('../../tmp/fooddata-research/catalog-payload.json',import.meta.url),'utf8')),prisma=new PrismaClient();
try{
  const cards=await prisma.foodProductCard.findMany({select:{id:true,canonicalName:true}}),byName=new Map(cards.map(c=>[c.canonicalName,c]));
  const matches=source.products.filter(p=>byName.has(p.name_ru));
  if(apply)for(const p of matches)await prisma.foodProductCard.update({where:{id:byName.get(p.name_ru).id},data:{energyKcalPer100g:p.energy_kcal,carbohydratePer100g:p.carbohydrate_g}});
  console.log(JSON.stringify({mode:apply?'apply':'dry-run',matched:matches.length,skipped:source.products.length-matches.length,source:'catalog-payload.json'}));
}finally{await prisma.$disconnect();}
