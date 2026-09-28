export type PurinePortion={foodKey:string;mealKey?:string;massG:number};
export type PurineCard={foodKey:string;displayName:string};
type Profile={mgPer100g:number;group:'animal'|'plant'|'other';level:'very_low'|'low'|'moderate'|'high';basis:string};
const round=(n:number,d=1)=>Number(n.toFixed(d));
const profiles:Array<[RegExp,Profile]>=[
 [/(печен|почки|сердце|субпродукт|ливер)/i,{mgPer100g:300,group:'animal',level:'high',basis:'категорийная оценка для субпродуктов'}],
 [/(анчоус|сардин|шпрот)/i,{mgPer100g:250,group:'animal',level:'high',basis:'категорийная оценка для мелкой жирной рыбы'}],
 [/(сельд|оселед)/i,{mgPer100g:139.6,group:'animal',level:'moderate',basis:'измеренное значение для сельди'}],
 [/(скумбр|макрел)/i,{mgPer100g:122.1,group:'animal',level:'moderate',basis:'измеренное значение для скумбрии'}],
 [/(тунец|тунець|лосос|треск|рыб|риба)/i,{mgPer100g:120,group:'animal',level:'moderate',basis:'категорийная оценка для рыбы'}],
 [/(миди|кревет|кальмар|устриц|гребеш|морепродукт)/i,{mgPer100g:140,group:'animal',level:'moderate',basis:'категорийная оценка для морепродуктов'}],
 [/(свинин.*лопат|лопат.*свинин)/i,{mgPer100g:81.4,group:'animal',level:'moderate',basis:'измеренное значение для свиной лопатки'}],
 [/(говядин|свинин|баранин|теляти|куриц|индейк|мяс)/i,{mgPer100g:100,group:'animal',level:'moderate',basis:'категорийная оценка для мяса'}],
 [/(чечевиц|фасол|нут|горох|соя)/i,{mgPer100g:55,group:'plant',level:'low',basis:'категорийная оценка для бобовых'}],
 [/(броккол)/i,{mgPer100g:61.9,group:'plant',level:'low',basis:'измеренное значение для брокколи'}],
 [/(шпинат)/i,{mgPer100g:57,group:'plant',level:'low',basis:'категорийная оценка для шпината'}],
 [/(яйц|молок|йогурт|кефир|сырок|сирок|творог|масло слив|сыр($|[ ,])|сир($|[ ,]))/i,{mgPer100g:.5,group:'animal',level:'very_low',basis:'низкопуриновая молочно-яичная категория'}],
 [/(чай|кофе|масло олив|масло подсол|масло рапс)/i,{mgPer100g:0,group:'other',level:'very_low',basis:'категория без значимой пуриновой нагрузки'}],
 [/(салат|руккол|кабач|морков|капуст|укроп|огур|томат|помид|перец|лук|овощ)/i,{mgPer100g:10,group:'plant',level:'very_low',basis:'категорийная оценка для овощей'}]
];
const profile=(name:string)=>profiles.find(([r])=>r.test(name))?.[1];
export function calculatePurineLoad(portions:PurinePortion[],cards:PurineCard[],minimumCoveragePercent=70){
 const byKey=new Map(cards.map(x=>[x.foodKey,x])),lines:any[]=[],unresolved:any[]=[];let validMassG=0,resolvedMassG=0;
 for(const p of portions){if(!Number.isFinite(p.massG)||p.massG<=0||p.massG>5000){unresolved.push({...p,reason:'MASS_INVALID'});continue;}validMassG+=p.massG;const card=byKey.get(p.foodKey);if(!card){unresolved.push({...p,reason:'CARD_NOT_FOUND'});continue;}const match=profile(card.displayName);if(!match){unresolved.push({...p,displayName:card.displayName,reason:'PURINE_PROFILE_MISSING'});continue;}const purineMg=match.mgPer100g*p.massG/100;resolvedMassG+=p.massG;lines.push({...p,displayName:card.displayName,massG:round(p.massG,3),purineMgPer100g:match.mgPer100g,purineMg:round(purineMg),group:match.group,level:match.level,basis:match.basis});}
 const rowCoveragePercent=portions.length?round(lines.length/portions.length*100):0,massCoveragePercent=validMassG?round(resolvedMassG/validMassG*100):0,passed=portions.length>0&&rowCoveragePercent>=minimumCoveragePercent&&massCoveragePercent>=minimumCoveragePercent,totalKnownMg=round(lines.reduce((s,x)=>s+x.purineMg,0)),animalKnownMg=round(lines.filter(x=>x.group==='animal').reduce((s,x)=>s+x.purineMg,0)),plantKnownMg=round(lines.filter(x=>x.group==='plant').reduce((s,x)=>s+x.purineMg,0)),prioritySources=[...lines].filter(x=>x.level==='high'||x.level==='moderate').sort((a,b)=>b.purineMg-a.purineMg);
 const status=!passed?'insufficient_data':prioritySources.some(x=>x.level==='high')?'high_source_present':prioritySources.length?'review_sources_and_portions':'no_priority_source_detected';
 return{status,totalKnownMg,knownTotalIsLowerEstimate:unresolved.length>0,animalKnownMg,plantKnownMg,prioritySources,lines,unresolved,qualityGate:{status:passed?'passed':'blocked',rowCoveragePercent,massCoveragePercent,minimumCoveragePercent,reasons:passed?[]:['Недостаточно распознанных продуктов для оценки пуриновой нагрузки.']},consultantFact:status==='high_source_present'?'Есть продукт из высокопуриновой категории; оцените порцию и повторяемость.':status==='review_sources_and_portions'?'Есть умеренные источники пуринов; оцените их сочетание, порции и повторяемость.':status==='no_priority_source_detected'?'Приоритетные источники пуринов в представленном рационе не выявлены.':'Оценка заблокирована полнотой данных.',associatedSignals:{alcoholAndFructoseAssessedSeparately:true},limitations:['Расчёт основан на измеренных и категорийных значениях и не определяет уровень мочевой кислоты.','Животные и растительные источники показаны раздельно; одинаковое число пуринов не трактуется как одинаковый клинический эффект.','Один день не характеризует обычный рацион.'],diagnosisGenerated:false,clientRecommendationGenerated:false};
}
