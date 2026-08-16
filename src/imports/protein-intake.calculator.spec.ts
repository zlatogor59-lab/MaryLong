import {describe,expect,it} from 'vitest';import {calculateProteinIntake,type ProductSnapshot} from './protein-intake.calculator';
const products=new Map<string,ProductSnapshot>([
  ['plant',{id:'plant',name:'Синтетический растительный продукт',proteinPer100g:10,origin:'plant',plantSharePercent:100,sourceLabel:'SYNTHETIC_TEST_ONLY',sourceReference:null,version:1}],
  ['animal',{id:'animal',name:'Синтетический животный продукт',proteinPer100g:20,origin:'animal',plantSharePercent:0,sourceLabel:'SYNTHETIC_TEST_ONLY',sourceReference:null,version:1}],
]);
describe('protein intake calculator',()=>{
  it('calculates totals, origin shares and meals from verified snapshots',()=>{const out=calculateProteinIntake([{mealKey:'breakfast',productCardId:'plant',massG:100},{mealKey:'lunch',productCardId:'animal',massG:150}],products);expect(out).toMatchObject({totalProteinG:40,plantProteinG:10,animalProteinG:30,plantSharePercent:25,completenessPercent:100});expect(out.mealTotals).toEqual([{mealKey:'breakfast',proteinG:10},{mealKey:'lunch',proteinG:30}]);});
  it('reports unresolved products and invalid masses without inventing values',()=>{const out=calculateProteinIntake([{mealKey:'x',productCardId:'missing',massG:100},{mealKey:'x',productCardId:'plant',massG:0}],products);expect(out.totalProteinG).toBe(0);expect(out.completenessPercent).toBe(0);expect(out.unresolved).toHaveLength(2);});
  it('does not flag a high plant share as an imbalance',()=>{const out=calculateProteinIntake([{mealKey:'dinner',productCardId:'plant',massG:200}],products);expect(out.plantSharePercent).toBe(100);});
});
