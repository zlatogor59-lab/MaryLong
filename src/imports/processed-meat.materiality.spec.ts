import {describe,expect,it} from 'vitest';
import {assessProcessedMeatMateriality} from './processed-meat.materiality';

const profile=(group:any,completeness:any={protein_percent:100,saturated_fat_percent:100,sodium_percent:100,composition_percent:100})=>({status:'available',group:{mass_g:80,animal_protein_share_percent:25,saturated_fat_g:5,sodium_mg:700,episodes:2,meals:2,...group},completeness});

describe('processed meat materiality',()=>{
  it('accepts a repeated contribution at the exact boundary',()=>expect(assessProcessedMeatMateriality(profile({}),100)).toMatchObject({status:'material',rule:'repeated_contribution'}));
  it('does not flag one gram below the repeated mass boundary',()=>expect(assessProcessedMeatMateriality(profile({mass_g:79}),100).status).toBe('not_material'));
  it('accepts a large single portion only with nutrient contribution',()=>expect(assessProcessedMeatMateriality(profile({mass_g:150,animal_protein_share_percent:40,episodes:1,meals:1,sodium_mg:1000}),100)).toMatchObject({status:'material',rule:'single_large_contribution'}));
  it('does not treat a small single portion as material',()=>expect(assessProcessedMeatMateriality(profile({mass_g:149,animal_protein_share_percent:60,episodes:1,meals:1,sodium_mg:1200}),100).status).toBe('not_material'));
  it('blocks the candidate when any required axis is incomplete',()=>expect(assessProcessedMeatMateriality(profile({}, {protein_percent:100,saturated_fat_percent:100,sodium_percent:50,composition_percent:100}),100).status).toBe('insufficient_data'));
  it('does not create a data warning when the group is absent',()=>expect(assessProcessedMeatMateriality({status:'not_present'},100).status).toBe('not_present'));
});
