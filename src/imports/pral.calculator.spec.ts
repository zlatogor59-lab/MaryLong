import{describe,expect,it}from'vitest';
import{calculatePral,type PralCard}from'./pral.calculator';
const mineral=(valuePer100g:number|null,status:any='analytical')=>({valuePer100g,unit:'mg' as const,status,sourceName:'CoFID',sourceVersion:'2021',sourceRecord:'x'});
const card:PralCard={foodKey:'x',displayName:'Продукт',proteinPer100g:10,minerals:{phosphorus:mineral(100),potassium:mineral(200),magnesium:mineral(20),calcium:mineral(50)}};
describe('PRAL Remer–Manz',()=>{
  it('uses all five published coefficients',()=>expect(calculatePral([{foodKey:'x',massG:100}],[card])).toMatchObject({pralMeqPerDay:3.2,interpretation:'acidifying',qualityGate:{status:'passed'}}));
  it('blocks interpretation when a component is missing',()=>expect(calculatePral([{foodKey:'x',massG:100}],[{...card,minerals:{...card.minerals,calcium:mineral(null,'missing')}}])).toMatchObject({knownTotalIsPartial:true,interpretation:'insufficient_data',qualityGate:{status:'blocked'}}));
  it('does not diagnose or recommend',()=>expect(calculatePral([{foodKey:'x',massG:100}],[card])).toMatchObject({diagnosisGenerated:false,clientRecommendationGenerated:false}));
});
