import fs from 'node:fs/promises';
import {PrismaClient} from '@prisma/client';

const registry=JSON.parse(await fs.readFile(new URL('../docs/ukrainian-food-catalog-priority-v1.json',import.meta.url),'utf8'));
const normalize=value=>String(value??'').toLocaleLowerCase('uk-UA').replace(/[’ʼ'`]/g,'').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
function auditPriorityCatalog(items,cards){
  const normalized=cards.map(card=>({...card,key:normalize(card.canonicalName)}));
  const rows=items.map(item=>{
    if(item.strategy==='label')return{...item,status:'needs_label',matched_card:null};
    const matches=normalized.filter(card=>item.match_terms.some(term=>card.key.includes(normalize(term))));
    return{...item,status:matches.length===1?'available':matches.length?'ambiguous':'missing_generic',matched_card:matches.length===1?matches[0].canonicalName:null};
  });
  const counts=rows.reduce((out,row)=>({...out,[row.status]:(out[row.status]??0)+1}),{});
  const priorityOneMissing=rows.filter(row=>row.priority===1&&row.status==='missing_generic');
  return{version:registry.version,total:rows.length,counts,priority_one_missing:priorityOneMissing.map(row=>({id:row.id,name_uk:row.name_uk,group:row.group})),rows};
}

const prisma=new PrismaClient();
try{
  const cards=await prisma.foodProductCard.findMany({where:{status:'verified'},select:{canonicalName:true,sourceLabel:true},orderBy:{canonicalName:'asc'}});
  console.log(JSON.stringify(auditPriorityCatalog(registry.items,cards),null,2));
}finally{await prisma.$disconnect();}
