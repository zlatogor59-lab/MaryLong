import fs from 'node:fs/promises';
import {Prisma,PrismaClient} from '@prisma/client';
import {sourceCode} from './lib/food-catalog-sync.mjs';
import {buildFoodMineralProfile,sameFoodMineralProfile} from './lib/food-mineral-profile.mjs';

const apply=process.argv.includes('--apply'),databaseUrl=new URL(process.env.DATABASE_URL||'');
if(!['localhost','127.0.0.1'].includes(databaseUrl.hostname))throw new Error('LOCAL_DATABASE_REQUIRED');
const source=JSON.parse(await fs.readFile(new URL('../../tmp/fooddata-research/photo-payload.json',import.meta.url),'utf8'));
const prisma=new PrismaClient();
try{
  const result=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('food-catalog-photo-001-mineral-sync-v1'))`;
    const existing=await tx.foodProductCard.findMany({where:{status:'verified'},select:{id:true,canonicalName:true,sourceLabel:true,mineralProfile:true,version:true}});
    const planned=[],unchanged=[];
    for(const product of source.products){
      const matches=existing.filter(card=>sourceCode(card.sourceLabel)===product.cofid_code||(product.product_id==='LOCAL-MILK-2.5'&&card.canonicalName===product.name_ru));
      if(matches.length!==1)throw new Error(`MINERAL_CARD_IDENTITY_INVALID:${product.product_id}:${matches.length}`);
      const card=matches[0],profile=buildFoodMineralProfile(product);if(sameFoodMineralProfile(card.mineralProfile,profile))unchanged.push(product.product_id);else planned.push({product,card,profile});
    }
    if(!apply)return{mode:'dry_run',updates:planned.map(item=>({id:item.card.id,product:item.product.product_id,fromVersion:item.card.version})),unchanged};
    for(const item of planned)await tx.foodProductCard.update({where:{id:item.card.id},data:{mineralProfile:item.profile,version:{increment:1}}});
    return{mode:'apply',updated:planned.length,products:planned.map(item=>item.product.product_id),unchanged};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  console.log(JSON.stringify(result));
}finally{await prisma.$disconnect();}
