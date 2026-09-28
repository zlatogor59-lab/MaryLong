import type {FoodEnrichmentProfile} from './food-enrichment-profile';
import type {VitaminDValueStatus} from './vitamin-d-intake.calculator';

export type VitaminECard={foodKey:string;displayName:string;valuePer100g:number|null;status:VitaminDValueStatus;sourceName:string;sourceVersion:string;enrichmentProfile:FoodEnrichmentProfile};
export type VitaminEPortion={foodKey:string;massG:number};
const round=(value:number,digits=2)=>Number(value.toFixed(digits));

export function calculateVitaminEIntake(portions:VitaminEPortion[],cards:VitaminECard[],targetMgTe=15){
  const byKey=new Map(cards.map(card=>[card.foodKey,card])),lines:any[]=[],unresolved:any[]=[];
  let validMass=0,resolvedMass=0,enrichmentResolvedMass=0;
  for(const portion of portions){
    if(!Number.isFinite(portion.massG)||portion.massG<=0||portion.massG>5000){unresolved.push({foodKey:portion.foodKey,reason:'MASS_INVALID'});continue;}
    validMass+=portion.massG;const card=byKey.get(portion.foodKey);
    if(!card){unresolved.push({foodKey:portion.foodKey,reason:'CARD_NOT_FOUND'});continue;}
    const naturalKnown=card.status==='trace'||(card.status!=='missing'&&card.valuePer100g!==null&&Number.isFinite(card.valuePer100g));
    if(naturalKnown)resolvedMass+=portion.massG;else unresolved.push({foodKey:portion.foodKey,reason:'NATURAL_VALUE_MISSING'});
    if(card.enrichmentProfile.status!=='unknown')enrichmentResolvedMass+=portion.massG;
    const naturalMgTe=(naturalKnown?(card.status==='trace'?0:Number(card.valuePer100g)):0)*portion.massG/100;
    const added=card.enrichmentProfile.status==='confirmed_fortified'?card.enrichmentProfile.nutrients.vitamin_e:undefined;
    const addedPer100g=added?(added.unit==='ug'?added.addedPer100g/1000:added.addedPer100g):0;
    lines.push({foodKey:portion.foodKey,displayName:card.displayName,naturalMgTe:round(naturalMgTe),addedMgTe:round(addedPer100g*portion.massG/100),totalKnownMgTe:round(naturalMgTe+addedPer100g*portion.massG/100)});
  }
  const naturalCoveragePercent=validMass?round(resolvedMass/validMass*100,1):0,enrichmentCoveragePercent=validMass?round(enrichmentResolvedMass/validMass*100,1):0;
  const sufficient=portions.length>0&&naturalCoveragePercent>=70&&!unresolved.some(item=>item.reason==='MASS_INVALID'||item.reason==='CARD_NOT_FOUND');
  const totalKnownMgTe=round(lines.reduce((sum,line)=>sum+line.totalKnownMgTe,0)),percentOfTarget=sufficient?round(totalKnownMgTe/targetMgTe*100,1):null;
  return{nutrient:'vitamin_e',unit:'mg_alpha_te',totalKnownMgTe,knownTotalIsLowerEstimate:unresolved.some(item=>item.reason==='NATURAL_VALUE_MISSING'||item.reason==='CARD_NOT_FOUND'||item.reason==='MASS_INVALID'),targetMgTe,percentOfTarget,status:!portions.length?'not_assessed':!sufficient?'insufficient_data':percentOfTarget!<100?'below_working_target':'working_target_met',completeness:{naturalCoveragePercent,enrichmentCoveragePercent,sufficient},lines,unresolved,deficiencyConclusionGenerated:false,clientRecommendationGenerated:false};
}
