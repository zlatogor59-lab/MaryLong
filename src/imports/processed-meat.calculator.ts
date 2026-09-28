import type {IntakeLine} from './protein-intake.calculator';
import {PROCESSED_MEAT_PROFILES,cofidCode} from './processed-meat.catalog';

const profiles=new Map(PROCESSED_MEAT_PROFILES.map(profile=>[profile.cofidCode,profile]));
const round=(value:number)=>Number(value.toFixed(2));

export function calculateProcessedMeat(lines:IntakeLine[]){
  const recognized=lines.flatMap(line=>{const code=cofidCode(line.product.sourceLabel),profile=code?profiles.get(code):undefined;return profile?[{line,profile}]:[];});
  const processed=recognized.filter(item=>item.profile.processed),comparators=recognized.filter(item=>!item.profile.processed);
  const sum=(items:typeof recognized,fn:(item:(typeof recognized)[number])=>number|null)=>{let total=0,known=0;for(const item of items){const value=fn(item);if(value!==null){total+=value;known++;}}return {value:known===items.length?round(total):null,known,total:round(total)};};
  const massG=round(processed.reduce((total,item)=>total+item.line.massG,0));
  const protein=sum(processed,item=>item.line.proteinG);
  const saturatedFat=sum(processed,item=>item.profile.saturatedFatPer100g===null?null:item.line.massG*item.profile.saturatedFatPer100g/100);
  const sodium=sum(processed,item=>item.profile.sodiumMgPer100g===null?null:item.line.massG*item.profile.sodiumMgPer100g/100);
  const allAnimalProtein=lines.reduce((total,line)=>total+line.animalProteinG,0);
  const meals=[...new Set(processed.map(item=>item.line.mealKey))];
  const items=processed.map(({line,profile})=>({meal_key:line.mealKey,product_card_id:line.productCardId,product_name:line.product.name,cofid_code:profile.cofidCode,category:profile.category,portion_g:round(line.massG),protein_g:round(line.proteinG),saturated_fat_g:profile.saturatedFatPer100g===null?null:round(line.massG*profile.saturatedFatPer100g/100),sodium_mg:profile.sodiumMgPer100g===null?null:round(line.massG*profile.sodiumMgPer100g/100),processing_class:profile.processingClass,composition_facts:profile.compositionFacts,source_quality:profile.sourceQuality}));
  const comparatorMass=round(comparators.reduce((total,item)=>total+item.line.massG,0));
  const facts=[] as {code:string;text:string}[];
  if(processed.length)facts.push({code:'GROUP_CONTRIBUTION',text:`Переработанное мясо: ${massG} г, ${protein.value??'н/д'} г белка${allAnimalProtein?` (${round((protein.value??protein.total)/allAnimalProtein*100)}% животного белка)`:''}.`});
  if(processed.length)facts.push({code:'SODIUM_AND_SFA',text:`Для учтённых порций: натрий ${sodium.value??'н/д'} мг, насыщенные жиры ${saturatedFat.value??'н/д'} г.`});
  if(meals.length>1)facts.push({code:'REPEATED_EPISODES',text:`Группа присутствует в ${meals.length} приёмах пищи; суммарная масса ${massG} г.`});
  if(comparatorMass)facts.push({code:'WHOLE_MEAT_COMPARATOR',text:`Цельное приготовленное мясо в том же дневнике: ${comparatorMass} г. Сравнение относится только к введённым порциям.`});
  return {status:processed.length?'available':'not_present',group:{mass_g:massG,protein_g:protein.value,animal_protein_share_percent:processed.length&&allAnimalProtein?round((protein.value??protein.total)/allAnimalProtein*100):null,saturated_fat_g:saturatedFat.value,sodium_mg:sodium.value,episodes:processed.length,meals:meals.length},whole_meat_comparator:{mass_g:comparatorMass,episodes:comparators.length},items,facts,completeness:{recognized_lines:recognized.length,processed_lines:processed.length,protein_percent:processed.length?100:0,saturated_fat_percent:processed.length?Math.round(saturatedFat.known/processed.length*100):0,sodium_percent:processed.length?Math.round(sodium.known/processed.length*100):0,composition_percent:processed.length?100:0},client_recommendations_generated:false,limitations:['Аминокислотный профиль не представлен: качество белка описывается только как белок животного происхождения.','Сведения о составе относятся к агрегированной выборке CoFID и не заменяют этикетку конкретного бренда.']};
}
