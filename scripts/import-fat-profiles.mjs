import fs from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';
const apply=process.argv.includes('--apply'),prisma=new PrismaClient();
const profiles=JSON.parse(await fs.readFile(new URL('../docs/fat-profiles-v1.json',import.meta.url),'utf8'));
const details=JSON.parse(await fs.readFile(new URL('../docs/fat-acid-details-usda-v1.json',import.meta.url),'utf8'));
let matched=0,updated=0;
const match=async name=>prisma.foodProductCard.findMany({where:{canonicalName:name,status:'verified'},select:{id:true}});
try{
  for(const p of profiles){
    const values=[p.total,p.sfa,p.mufa,p.pufa,p.trans,p.omega6,p.omega3].filter(v=>v!==null);
    if(values.some(v=>!Number.isFinite(v)||v<0)||p.sfa+p.mufa+p.pufa>p.total+0.2){console.log(JSON.stringify({name:p.name,status:'invalid_profile'}));continue;}
    const rows=await match(p.name);if(rows.length!==1){console.log(JSON.stringify({name:p.name,status:rows.length?'ambiguous':'not_found',matches:rows.length}));continue;}matched++;
    if(!apply){console.log(JSON.stringify({name:p.name,status:'would_update',quality:p.quality}));continue;}
    await prisma.foodProductCard.update({where:{id:rows[0].id},data:{totalFatPer100g:p.total,saturatedFatPer100g:p.sfa,monounsaturatedFatPer100g:p.mufa,polyunsaturatedFatPer100g:p.pufa,transFatPer100g:p.trans,omega6TotalPer100g:p.omega6,omega3TotalPer100g:p.omega3,fatProfileSource:p.source,fatProfileQuality:p.quality,version:{increment:1}}});updated++;
  }
  for(const p of details){
    const values=[p.palmitic,p.linoleic_n6,p.ala,p.epa,p.dha].filter(v=>v!==null);if(values.some(v=>!Number.isFinite(v)||v<0)){console.log(JSON.stringify({name:p.name,status:'invalid_detail'}));continue;}
    const rows=await match(p.name);if(rows.length!==1){console.log(JSON.stringify({name:p.name,status:rows.length?'ambiguous_detail':'detail_not_found',matches:rows.length}));continue;}matched++;
    if(!apply){console.log(JSON.stringify({name:p.name,status:'would_update_detail',source:`USDA SR Legacy FDC ${p.fdc_id}`}));continue;}
    await prisma.foodProductCard.update({where:{id:rows[0].id},data:{palmiticAcidPer100g:p.palmitic,omega6LaPer100g:p.linoleic_n6,omega3AlaPer100g:p.ala,epaPer100g:p.epa,dhaPer100g:p.dha,fatDetailSource:`USDA SR Legacy FDC ${p.fdc_id}`,fatDetailQuality:'supplemental_proxy',version:{increment:1}}});updated++;
  }
}finally{await prisma.$disconnect();}
console.log(JSON.stringify({mode:apply?'apply':'dry_run',profiles:profiles.length,details:details.length,matched,updated}));
