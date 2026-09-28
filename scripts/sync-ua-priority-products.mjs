import fs from 'node:fs/promises';
import {Prisma,PrismaClient} from '@prisma/client';

const apply=process.argv.includes('--apply');
const source=JSON.parse(await fs.readFile(new URL('../docs/ukrainian-food-products-priority-v1.json',import.meta.url),'utf8'));
const prisma=new PrismaClient();

try{
  const result=await prisma.$transaction(async tx=>{
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('food-catalog-ua-priority-v1'))`;
    const names=source.products.map(product=>product.name);
    const existing=await tx.foodProductCard.findMany({where:{canonicalName:{in:names}},select:{id:true,canonicalName:true,sourceLabel:true,status:true}});
    const conflicts=existing.filter(card=>card.sourceLabel!==source.products.find(product=>product.name===card.canonicalName)?.sourceLabel);
    if(conflicts.length)throw new Error(`UA_PRIORITY_CATALOG_CONFLICT:${JSON.stringify(conflicts)}`);
    const creates=source.products.filter(product=>!existing.some(card=>card.canonicalName===product.name));
    if(!apply)return{mode:'dry_run',create:creates.map(product=>product.name),skip:existing.map(card=>card.canonicalName)};
    const verifier=await tx.user.findFirst({where:{role:'admin',status:'active'},select:{id:true}});
    if(!verifier)throw new Error('ACTIVE_ADMIN_REQUIRED');
    const created=[];
    for(const product of creates){
      const row=await tx.foodProductCard.create({data:{
        canonicalName:product.name,
        proteinPer100g:product.proteinPer100g,
        energyKcalPer100g:product.energyKcalPer100g,
        carbohydratePer100g:product.carbohydratePer100g,
        fibrePer100g:product.fibrePer100g,
        totalSugarsPer100g:product.totalSugarsPer100g,
        freeSugarsPer100g:null,
        carbohydrateSourceClass:product.origin==='plant'?'preferred_source':'other',
        carbohydrateQualitySource:product.sourceLabel,
        carbohydrateFlags:[],
        carbohydrateDataReliability:'source_record',
        totalFatPer100g:product.totalFatPer100g,
        saturatedFatPer100g:product.saturatedFatPer100g,
        monounsaturatedFatPer100g:product.monounsaturatedFatPer100g,
        polyunsaturatedFatPer100g:product.polyunsaturatedFatPer100g,
        transFatPer100g:product.transFatPer100g,
        fatProfileSource:product.sourceLabel,
        fatProfileQuality:'source_record',
        mineralProfile:product.mineralProfile,
        vitaminProfile:product.vitaminProfile,
        origin:product.origin,
        plantSharePercent:product.origin==='plant'?100:0,
        sourceLabel:product.sourceLabel,
        sourceReference:product.sourceReference,
        status:'verified',
        createdBy:verifier.id,
        verifiedBy:verifier.id,
        verifiedAt:new Date(),
      },select:{id:true,canonicalName:true}});
      created.push(row);
    }
    return{mode:'apply',created,skipped:existing.map(card=>card.canonicalName)};
  },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  console.log(JSON.stringify(result,null,2));
}finally{await prisma.$disconnect();}
