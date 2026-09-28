import {Prisma,PrismaClient} from '@prisma/client';
import {planFoodCatalogSync} from './lib/food-catalog-sync.mjs';

const apply=process.argv.includes('--apply'),databaseUrl=new URL(process.env.DATABASE_URL||'');
if(!['localhost','127.0.0.1'].includes(databaseUrl.hostname))throw new Error('LOCAL_DATABASE_REQUIRED');
const url='https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid';
const products=[
  ['19-496','Ветчина, готовая к употреблению',18.4,107,1,3.3,1.1,.1,1,'processed',['added_water_10_15_percent','smoked_or_honey_roast_samples']],
  ['19-517','Салями',20.9,438,.5,39.2,14.6,.4,.5,'processed',['meat_content_90_100_percent']],
  ['19-495','Франкфуртские сосиски',13.6,287,1.1,25.4,9.2,.1,1.1,'processed',['meat_content_75_90_percent']],
  ['19-509','Свиные колбаски, охлаждённые, гриль',14.5,294,9.8,22.1,8,2.3,1.5,'processed',['composite_meat_product']],
  ['19-500','Бекон из спинной части, гриль',23.2,287,0,21.6,8.1,0,0,'processed',['smoked_and_unsmoked_samples']],
  ['19-317','Паштет печёночный',12.6,349,1.2,32.7,9.5,.6,.4,'processed',['includes_canned_samples']],
  ['19-128','Солонина из говядины, консервированная',25.9,205,1,10.9,5.7,0,1,'processed',['canned_meat']],
  ['18-503','Кусочки курицы/индейки в панировке, запечённые',14.4,256,19.6,13.9,2.11,2.3,1.1,'composite_processed',['coated_or_battered','formed_poultry_product']],
  ['19-546','Бургер из говядины 62–85%, гриль',18.3,229,8.5,13.8,5.22,.6,2.1,'composite_processed',['meat_content_62_85_percent','added_onion']],
].map(([cofid_code,name_ru,protein_g,energy_kcal,carbohydrate_g,fat_g,sfa,fibre,sugars,processingClass,flags])=>({cofid_code,name_ru,protein_g,energy_kcal,carbohydrate_g,fat_g,sfa,fibre,sugars,processingClass,flags}));
const prisma=new PrismaClient();
try{const result=await prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('food-catalog-processed-meat-sync-v1'))`;const existing=await tx.foodProductCard.findMany({where:{OR:products.flatMap(p=>[{canonicalName:p.name_ru},{sourceLabel:{contains:p.cofid_code}}])},select:{id:true,canonicalName:true,sourceLabel:true}});const plan=planFoodCatalogSync(products,existing);if(plan.conflicts.length)throw new Error(`FOOD_CATALOG_CONFLICT:${JSON.stringify(plan.conflicts)}`);if(!apply)return {mode:'dry_run',create:plan.creates.map(x=>x.cofid_code),skip:plan.skips};const verifier=await tx.user.findFirst({where:{role:'admin',status:'active'},select:{id:true}});if(!verifier)throw new Error('ACTIVE_ADMIN_REQUIRED');const created=[];for(const p of plan.creates){const row=await tx.foodProductCard.create({data:{canonicalName:p.name_ru,proteinPer100g:p.protein_g,energyKcalPer100g:p.energy_kcal,carbohydratePer100g:p.carbohydrate_g,fibrePer100g:p.fibre,totalSugarsPer100g:p.sugars,freeSugarsPer100g:null,carbohydrateSourceClass:'other',carbohydrateQualitySource:`CoFID 2021 ${p.cofid_code}`,processingClass:p.processingClass,carbohydrateFlags:p.flags,carbohydrateDataReliability:'direct_analysis',totalFatPer100g:p.fat_g,saturatedFatPer100g:p.sfa,fatProfileSource:`CoFID 2021 ${p.cofid_code}`,fatProfileQuality:'direct',origin:'animal',plantSharePercent:0,sourceLabel:`CoFID 2021; ${p.cofid_code}`,sourceReference:url,status:'verified',createdBy:verifier.id,verifiedBy:verifier.id,verifiedAt:new Date()},select:{id:true}});created.push({code:p.cofid_code,id:row.id});}return {mode:'apply',created,skipped:plan.skips};},{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});console.log(JSON.stringify(result));}finally{await prisma.$disconnect();}
