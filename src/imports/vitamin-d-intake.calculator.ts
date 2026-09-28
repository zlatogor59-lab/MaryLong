import type { FoodEnrichmentProfile } from './food-enrichment-profile';
export type VitaminDValueStatus='analytical'|'calculated'|'borrowed'|'trace'|'missing';
export type VitaminDCard={foodKey:string;displayName:string;naturalVitaminDUgPer100g:number|null;naturalValueStatus:VitaminDValueStatus;naturalSourceName:string;naturalSourceVersion:string;enrichmentProfile:FoodEnrichmentProfile};
export type VitaminDPortion={foodKey:string;massG:number};
const round=(value:number,digits=2)=>Number(value.toFixed(digits));
export function calculateVitaminDIntake(portions:VitaminDPortion[],cards:VitaminDCard[],targetUg=15){
  if(!Number.isFinite(targetUg)||targetUg<=0)throw new Error('VITAMIN_D_TARGET_INVALID');
  const byKey=new Map(cards.map(card=>[card.foodKey,card])),lines:Array<{foodKey:string;displayName:string;massG:number;naturalUg:number;addedUg:number;totalKnownUg:number;enrichmentStatus:string}>=[],unresolved:Array<{foodKey:string;reason:'MASS_INVALID'|'CARD_NOT_FOUND'|'NATURAL_VALUE_MISSING'|'ENRICHMENT_UNKNOWN'}>=[];
  let validMass=0,naturalResolvedMass=0,enrichmentResolvedMass=0;
  for(const portion of portions){
    if(!Number.isFinite(portion.massG)||portion.massG<=0||portion.massG>5000){unresolved.push({foodKey:portion.foodKey,reason:'MASS_INVALID'});continue;}
    validMass+=portion.massG;const card=byKey.get(portion.foodKey);if(!card){unresolved.push({foodKey:portion.foodKey,reason:'CARD_NOT_FOUND'});continue;}
    const naturalKnown=card.naturalValueStatus==='trace'||(card.naturalValueStatus!=='missing'&&card.naturalVitaminDUgPer100g!==null&&Number.isFinite(card.naturalVitaminDUgPer100g)&&card.naturalVitaminDUgPer100g>=0);
    if(naturalKnown)naturalResolvedMass+=portion.massG;else unresolved.push({foodKey:portion.foodKey,reason:'NATURAL_VALUE_MISSING'});
    const enrichmentKnown=card.enrichmentProfile.status!=='unknown';if(enrichmentKnown)enrichmentResolvedMass+=portion.massG;else unresolved.push({foodKey:portion.foodKey,reason:'ENRICHMENT_UNKNOWN'});
    const naturalUg=naturalKnown?(card.naturalValueStatus==='trace'?0:Number(card.naturalVitaminDUgPer100g))*portion.massG/100:0,added=card.enrichmentProfile.status==='confirmed_fortified'?card.enrichmentProfile.nutrients.vitamin_d:undefined,addedUgPer100g=added?(added.unit==='ug'?added.addedPer100g:added.addedPer100g*1000):0,addedUg=addedUgPer100g*portion.massG/100;
    lines.push({foodKey:portion.foodKey,displayName:card.displayName,massG:round(portion.massG),naturalUg:round(naturalUg),addedUg:round(addedUg),totalKnownUg:round(naturalUg+addedUg),enrichmentStatus:card.enrichmentProfile.status});
  }
  const naturalCoveragePercent=validMass?round(naturalResolvedMass/validMass*100,1):0,enrichmentCoveragePercent=validMass?round(enrichmentResolvedMass/validMass*100,1):0,sufficient=portions.length>0&&naturalCoveragePercent>=70&&enrichmentCoveragePercent>=70&&!unresolved.some(x=>x.reason==='MASS_INVALID'),totalKnownUg=round(lines.reduce((sum,line)=>sum+line.totalKnownUg,0)),percentOfTarget=sufficient?round(totalKnownUg/targetUg*100,1):null,status=!portions.length?'not_assessed':!sufficient?'insufficient_data':percentOfTarget!<100?'below_working_target':'working_target_met';
  return{nutrient:'vitamin_d',unit:'ug',totalKnownUg,knownTotalIsLowerEstimate:unresolved.length>0,targetUg,percentOfTarget,status,completeness:{naturalCoveragePercent,enrichmentCoveragePercent,sufficient},lines,unresolved,consultantFact:status==='insufficient_data'?'Для сравнения пищевого поступления витамина D недостаточно данных о составе или обогащении.':status==='below_working_target'?'Расчётное пищевое поступление витамина D ниже рабочего ориентира; это не оценка обеспеченности организма.':status==='working_target_met'?'Рабочий ориентир пищевого поступления витамина D достигнут; это не оценка обеспеченности организма.':'Расчёт не выполнен.',bodyStatusAssessed:false,deficiencyConclusionGenerated:false,clientRecommendationGenerated:false};
}
