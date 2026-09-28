export type ProteinOrigin='plant'|'animal'|'mixed';
export type ProductSnapshot={id:string;name:string;proteinPer100g:number;origin:ProteinOrigin;plantSharePercent:number;sourceLabel:string;sourceReference:string|null;version:number;energyKcalPer100g?:number|null;carbohydratePer100g?:number|null;fibrePer100g?:number|null;totalSugarsPer100g?:number|null;freeSugarsPer100g?:number|null;carbohydrateSourceClass?:string|null;carbohydrateQualitySource?:string|null;totalFatPer100g?:number|null;saturatedFatPer100g?:number|null;monounsaturatedFatPer100g?:number|null;polyunsaturatedFatPer100g?:number|null;transFatPer100g?:number|null;omega6TotalPer100g?:number|null;omega3TotalPer100g?:number|null;omega6LaPer100g?:number|null;omega3AlaPer100g?:number|null;epaPer100g?:number|null;dhaPer100g?:number|null;palmiticAcidPer100g?:number|null;fatProfileSource?:string|null;fatProfileQuality?:string|null;fatDetailSource?:string|null;fatDetailQuality?:string|null};
export type FoodIdentity='exact'|'generic_fish'|'generic_marine_fish'|'generic_freshwater_fish';
export type IntakeInput={mealKey:string;productCardId:string;massG:number;foodIdentity?:FoodIdentity};
export type IntakeLine=IntakeInput&{product:ProductSnapshot;proteinG:number;plantProteinG:number;animalProteinG:number};

export function calculateProteinIntake(inputs:IntakeInput[],products:Map<string,ProductSnapshot>) {
  const lines:IntakeLine[]=[];const unresolved:{index:number;reason:'PRODUCT_NOT_VERIFIED'|'MASS_INVALID'}[]=[];
  inputs.forEach((input,index)=>{const product=products.get(input.productCardId);
    if(!product){unresolved.push({index,reason:'PRODUCT_NOT_VERIFIED'});return;}
    if(!Number.isFinite(input.massG)||input.massG<=0||input.massG>5000){unresolved.push({index,reason:'MASS_INVALID'});return;}
    const proteinG=input.massG*product.proteinPer100g/100,plantProteinG=proteinG*product.plantSharePercent/100;
    lines.push({...input,product,proteinG,plantProteinG,animalProteinG:proteinG-plantProteinG});
  });
  const sum=(key:'proteinG'|'plantProteinG'|'animalProteinG')=>lines.reduce((total,line)=>total+line[key],0);
  const totalProteinG=sum('proteinG'),plantProteinG=sum('plantProteinG'),animalProteinG=sum('animalProteinG');
  const mealTotals=Object.values(lines.reduce<Record<string,{mealKey:string;proteinG:number}>>((out,line)=>{out[line.mealKey]??={mealKey:line.mealKey,proteinG:0};out[line.mealKey].proteinG+=line.proteinG;return out;},{}));
  return {lines,unresolved,totalProteinG,plantProteinG,animalProteinG,plantSharePercent:totalProteinG?plantProteinG/totalProteinG*100:null,
    completenessPercent:inputs.length?Math.round(lines.length/inputs.length*100):0,mealTotals};
}
