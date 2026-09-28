import type {FoodMineralValue} from './food-mineral-intake.calculator';

export type PralCard={
  foodKey:string;
  displayName:string;
  proteinPer100g:number;
  minerals:Partial<Record<'phosphorus'|'potassium'|'magnesium'|'calcium',FoodMineralValue>>;
};
export type PralPortion={foodKey:string;massG:number};

const round=(value:number,digits=2)=>Number(value.toFixed(digits));
const known=(value:FoodMineralValue|undefined)=>Boolean(value&&value.status!=='missing'&&(value.status==='trace'||(value.valuePer100g!==null&&Number.isFinite(value.valuePer100g)&&value.valuePer100g>=0)));
const amount=(value:FoodMineralValue,massG:number)=>value.status==='trace'?0:Number(value.valuePer100g)*massG/100*(value.unit==='ug'?0.001:1);

export function calculatePral(portions:PralPortion[],cards:PralCard[],minimumCoveragePercent=70){
  const byKey=new Map(cards.map(card=>[card.foodKey,card]));
  const lines:Array<{foodKey:string;displayName:string;massG:number;proteinG:number;phosphorusMg:number;potassiumMg:number;magnesiumMg:number;calciumMg:number;pralMeq:number}>=[];
  const unresolved:Array<{foodKey:string;massG:number;reason:string;missingComponents:string[]}>=[];
  let validMassG=0,resolvedMassG=0;
  for(const portion of portions){
    if(!Number.isFinite(portion.massG)||portion.massG<=0||portion.massG>5000){unresolved.push({...portion,reason:'MASS_INVALID',missingComponents:[]});continue;}
    validMassG+=portion.massG;const card=byKey.get(portion.foodKey);
    if(!card){unresolved.push({...portion,reason:'CARD_NOT_FOUND',missingComponents:['protein','phosphorus','potassium','magnesium','calcium']});continue;}
    const missingComponents:string[]=(['phosphorus','potassium','magnesium','calcium'] as const).filter(key=>!known(card.minerals[key]));
    if(!Number.isFinite(card.proteinPer100g)||card.proteinPer100g<0)missingComponents.unshift('protein');
    if(missingComponents.length){unresolved.push({...portion,reason:'COMPONENT_MISSING',missingComponents});continue;}
    const proteinG=card.proteinPer100g*portion.massG/100;
    const phosphorusMg=amount(card.minerals.phosphorus!,portion.massG),potassiumMg=amount(card.minerals.potassium!,portion.massG),magnesiumMg=amount(card.minerals.magnesium!,portion.massG),calciumMg=amount(card.minerals.calcium!,portion.massG);
    const pralMeq=.49*proteinG+.037*phosphorusMg-.021*potassiumMg-.026*magnesiumMg-.013*calciumMg;
    resolvedMassG+=portion.massG;lines.push({foodKey:portion.foodKey,displayName:card.displayName,massG:round(portion.massG,3),proteinG:round(proteinG,3),phosphorusMg:round(phosphorusMg,3),potassiumMg:round(potassiumMg,3),magnesiumMg:round(magnesiumMg,3),calciumMg:round(calciumMg,3),pralMeq:round(pralMeq,3)});
  }
  const totals={proteinG:round(lines.reduce((s,x)=>s+x.proteinG,0)),phosphorusMg:round(lines.reduce((s,x)=>s+x.phosphorusMg,0)),potassiumMg:round(lines.reduce((s,x)=>s+x.potassiumMg,0)),magnesiumMg:round(lines.reduce((s,x)=>s+x.magnesiumMg,0)),calciumMg:round(lines.reduce((s,x)=>s+x.calciumMg,0))};
  const rowCoveragePercent=portions.length?round(lines.length/portions.length*100,1):0,massCoveragePercent=validMassG?round(resolvedMassG/validMassG*100,1):0;
  const sufficient=portions.length>0&&unresolved.every(x=>x.reason!=='MASS_INVALID')&&rowCoveragePercent>=minimumCoveragePercent&&massCoveragePercent>=minimumCoveragePercent;
  const pralMeqPerDay=round(.49*totals.proteinG+.037*totals.phosphorusMg-.021*totals.potassiumMg-.026*totals.magnesiumMg-.013*totals.calciumMg,1);
  return{method:'Remer–Manz',formula:'0.49 × protein_g + 0.037 × phosphorus_mg − 0.021 × potassium_mg − 0.026 × magnesium_mg − 0.013 × calcium_mg',unit:'mEq/day',pralMeqPerDay,knownTotalIsPartial:unresolved.length>0,interpretation:sufficient?(pralMeqPerDay>0?'acidifying':'alkalizing_or_neutral'):'insufficient_data',qualityGate:{status:sufficient?'passed':'blocked',rowCoveragePercent,massCoveragePercent,minimumCoveragePercent,reasons:sufficient?[]:['Недостаточно полных данных по компонентам формулы PRAL.']},totals,lines,unresolved,diagnosisGenerated:false,clientRecommendationGenerated:false};
}
