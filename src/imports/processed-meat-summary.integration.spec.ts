import {describe,expect,it} from 'vitest';
import {calculateProteinIntake,type ProductSnapshot} from './protein-intake.calculator';
import {calculateProcessedMeat} from './processed-meat.calculator';
import {calculateFatIntake,type FatProductSnapshot} from './fat-intake.calculator';
import {calculateCarbohydrateIntake,type CarbohydrateProductSnapshot} from './carbohydrate-intake.calculator';
import {calculateNutritionSummary} from './nutrition-summary.calculator';
import {calculateProteinClientExplanation} from './protein-client-explanation.calculator';
import {buildApprovedClientNutrientPayload} from './nutrient-client-publication';
import {calculateSaltCoffee} from './salt-coffee.calculator';

const ham={id:'ham',name:'Ветчина, готовая к употреблению',proteinPer100g:18.4,origin:'animal',plantSharePercent:0,sourceLabel:'CoFID 2021; 19-496',sourceReference:'cofid',version:1,carbohydratePer100g:1,fibrePer100g:.1,totalSugarsPer100g:1,freeSugarsPer100g:0,carbohydrateSourceClass:'other',starchPer100g:0,polyolsPer100g:0,resistantStarchPer100g:0,sugarOriginClass:'unknown',carbohydrateFoodGroup:'processed_meat',foodMatrixClass:'processed',processingClass:'processed',carbohydrateFlags:[],carbohydrateDataReliability:'direct_analysis',totalFatPer100g:3.3,saturatedFatPer100g:1.1,monounsaturatedFatPer100g:1.37,polyunsaturatedFatPer100g:.51,transFatPer100g:0,omega6TotalPer100g:.44,omega3TotalPer100g:.06,omega6LaPer100g:.44,omega3AlaPer100g:.06,epaPer100g:0,dhaPer100g:0,palmiticAcidPer100g:.7} as const;
const plant={id:'plant',name:'Синтетический цельный растительный продукт',proteinPer100g:5,origin:'plant',plantSharePercent:100,sourceLabel:'SYNTHETIC_INTEGRATION_ONLY',sourceReference:null,version:1,carbohydratePer100g:50,fibrePer100g:6,totalSugarsPer100g:2,freeSugarsPer100g:0,carbohydrateSourceClass:'preferred_source',starchPer100g:40,polyolsPer100g:0,resistantStarchPer100g:2,sugarOriginClass:'naturally_occurring',carbohydrateFoodGroup:'whole_grain',foodMatrixClass:'intact_or_coarse',processingClass:'minimally_processed',carbohydrateFlags:[],carbohydrateDataReliability:'direct_analysis',totalFatPer100g:9.34,saturatedFatPer100g:2,monounsaturatedFatPer100g:3,polyunsaturatedFatPer100g:4,transFatPer100g:.1,omega6TotalPer100g:3,omega3TotalPer100g:1,omega6LaPer100g:2.4,omega3AlaPer100g:.5,epaPer100g:.03,dhaPer100g:.03,palmiticAcidPer100g:.5} as const;

describe('synthetic typical-ration integration',()=>{
  it('flows processed meat into consultant top-3 but not into approved client nutrient payload',()=>{
    const inputs=[{mealKey:'breakfast',productCardId:'ham',massG:50},{mealKey:'lunch',productCardId:'ham',massG:50},{mealKey:'dinner',productCardId:'plant',massG:500}];
    const products=new Map<string,any>([['ham',ham],['plant',plant]]),proteinCalculation=calculateProteinIntake(inputs,products as Map<string,ProductSnapshot>),processed=calculateProcessedMeat(proteinCalculation.lines),fatCalculation=calculateFatIntake(inputs,products as Map<string,FatProductSnapshot>,2000,45,55),carbohydrateCalculation=calculateCarbohydrateIntake(inputs,products as Map<string,CarbohydrateProductSnapshot>,2000);
    const saltCoffee=calculateSaltCoffee([{mealKey:'lunch',catalogKey:'SC-SALT-UNSPECIFIED',massG:2},{mealKey:'breakfast',catalogKey:'SC-COFFEE-FILTER',volumeMl:200}]);
    const protein={version:1,summary:{completeness_percent:proteinCalculation.completenessPercent,range_status:'within_range',plant_share_status:'meets_guide'},processed_meat:processed,salt_coffee:saltCoffee,client_approval:{status:'draft'}};
    const fat={source_intake_version:1,summary:{fat_balance:{status:fatCalculation.fatBalance.status},completeness:fatCalculation.completeness,signals:fatCalculation.signals},client_approval:{status:'draft'}};
    const carbohydrate={source_intake_version:1,summary:{data_status:carbohydrateCalculation.dataStatus,signals:carbohydrateCalculation.signals},client_approval:{status:'draft'}};
    const summary=calculateNutritionSummary(protein,fat,carbohydrate);
    expect(processed.group).toMatchObject({mass_g:100,animal_protein_share_percent:100,episodes:2,meals:2,sodium_mg:800});
    expect(summary.priorities).toEqual([expect.objectContaining({module_key:'processed_meat',code:'processed_meat_material',materiality_rule:'repeated_contribution'}),expect.objectContaining({module_key:'salt_coffee',code:'salt_iodine_lower_estimate',materiality_rule:'iodine_lower_estimate'})]);
    expect(summary.modules.find(module=>module.key==='processed_meat')).toMatchObject({client_publication_status:'not_applicable'});
    const approved=buildApprovedClientNutrientPayload('protein',calculateProteinClientExplanation(protein.summary),true),serialized=JSON.stringify(approved);
    expect(serialized).not.toContain('processed_meat');expect(serialized).not.toContain('salt_coffee');expect(serialized).not.toContain('Ветчина');expect(serialized).not.toContain('Кофе');expect(serialized).not.toContain('натрия');expect(processed.client_recommendations_generated).toBe(false);expect(saltCoffee.client_recommendations_generated).toBe(false);
  });
});
