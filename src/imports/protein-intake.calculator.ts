export type ProteinOrigin='plant'|'animal'|'mixed';
export type ProductSnapshot={id:string;name:string;proteinPer100g:number;origin:ProteinOrigin;plantSharePercent:number;sourceLabel:string;sourceReference:string|null;version:number};
export type IntakeInput={mealKey:string;productCardId:string;massG:number};
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
