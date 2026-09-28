export type ProcessedMeatMateriality={status:'not_present'|'insufficient_data'|'not_material'|'material';rule:'none'|'repeated_contribution'|'single_large_contribution';message:string|null};

export function assessProcessedMeatMateriality(processed:any,proteinCompleteness:number|null|undefined):ProcessedMeatMateriality{
  if(!processed||processed.status==='not_present')return{status:'not_present',rule:'none',message:null};
  const c=processed.completeness??{},g=processed.group??{};
  const complete=proteinCompleteness===100&&c.protein_percent===100&&c.saturated_fat_percent===100&&c.sodium_percent===100&&c.composition_percent===100;
  const valuesKnown=[g.mass_g,g.animal_protein_share_percent,g.saturated_fat_g,g.sodium_mg,g.episodes,g.meals].every(Number.isFinite);
  if(!complete||!valuesKnown)return{status:'insufficient_data',rule:'none',message:null};
  const nutrientContribution=g.sodium_mg>=1000||g.saturated_fat_g>=10;
  const repeated=g.episodes>=2&&g.meals>=2&&g.mass_g>=80&&(g.animal_protein_share_percent>=25||nutrientContribution);
  const singleLarge=g.mass_g>=150&&g.animal_protein_share_percent>=40&&nutrientContribution;
  if(!repeated&&!singleLarge)return{status:'not_material',rule:'none',message:null};
  const rule=repeated?'repeated_contribution':'single_large_contribution';
  const context=repeated?`группа присутствует в ${g.meals} приёмах пищи`:`учтена порция ${g.mass_g} г`;
  return{status:'material',rule,message:`В заявленном типичном рационе ${context}; суммарно ${g.mass_g} г, ${g.animal_protein_share_percent}% животного белка, ${g.sodium_mg} мг натрия и ${g.saturated_fat_g} г насыщенных жиров. Это факт для проверки консультантом, а не диагноз или готовая рекомендация.`};
}
