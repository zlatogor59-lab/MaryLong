const keys={calcium:'calcium_mg',phosphorus:'phosphorus_mg',magnesium:'magnesium_mg',iron:'iron_mg',zinc:'zinc_mg',manganese:'manganese_mg',sodium:'sodium_mg',potassium:'potassium_mg'};
const fields=value=>new Set(String(value??'').split(',').map(item=>item.trim()).filter(Boolean));

export function buildFoodMineralProfile(product){
  const trace=fields(product.trace_fields),missing=fields(product.missing_fields),record=product.cofid_code||product.product_id;
  const baseStatus=product.product_id==='LOCAL-MILK-2.5'||/calculated/i.test(product.description_source??'')?'calculated':/прокси/i.test(product.name_ru??'')?'borrowed':'analytical';
  const profile={};
  for(const [nutrient,field] of Object.entries(keys)){
    const isTrace=trace.has(field),isMissing=missing.has(field)||product[field]==null;
    profile[nutrient]={valuePer100g:isTrace||isMissing?null:Number(product[field]),unit:'mg',status:isMissing?'missing':isTrace?'trace':baseStatus,sourceName:product.source,sourceVersion:product.product_id==='LOCAL-MILK-2.5'?'PHOTO-001-v1':'CoFID 2021',sourceRecord:record};
  }
  profile.copper={valuePer100g:null,unit:'ug',status:'missing',sourceName:'PHOTO-001 — значение не предоставлено',sourceVersion:'PHOTO-001-v1',sourceRecord:record};
  profile.molybdenum=product.product_id==='COFID-13-523'
    ?{valuePer100g:3.723,unit:'ug',status:'borrowed',sourceName:'USDA FoodData Central Foundation',sourceVersion:'2026-04',sourceRecord:'FDC 2346406'}
    :{valuePer100g:null,unit:'ug',status:'missing',sourceName:'USDA FoodData Central Foundation — подходящее значение не найдено',sourceVersion:'2026-04',sourceRecord:record};
  return profile;
}

const canonical=value=>typeof value==='number'&&Number.isFinite(value)?Number(value.toPrecision(12)):Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const sameFoodMineralProfile=(left,right)=>JSON.stringify(canonical(left??{}))===JSON.stringify(canonical(right??{}));
