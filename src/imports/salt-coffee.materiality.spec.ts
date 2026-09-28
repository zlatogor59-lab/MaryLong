import {describe,expect,it} from 'vitest';import {assessSaltCoffeeMateriality} from './salt-coffee.materiality';
describe('salt and coffee materiality',()=>{
  it('raises only the iodine lower-estimate limitation',()=>expect(assessSaltCoffeeMateriality({status:'available',totals:{added_salt_g:2},completeness:{salt_iodine_percent:0}})).toMatchObject({status:'material',rule:'iodine_lower_estimate'}));
  it('does not turn approximate or unknown caffeine into a top-3 claim',()=>expect(assessSaltCoffeeMateriality({status:'available',totals:{added_salt_g:0,coffee_ml:400},completeness:{coffee_caffeine_percent:0}}).status).toBe('not_material'));
  it('does not flag confirmed iodized salt',()=>expect(assessSaltCoffeeMateriality({status:'available',totals:{added_salt_g:2},completeness:{salt_iodine_percent:100}}).status).toBe('not_material'));
  it('flags a recorded salt event even when its mass is unknown',()=>expect(assessSaltCoffeeMateriality({status:'available',totals:{added_salt_g:null,added_salt_lower_estimate_g:0},completeness:{salt_iodine_percent:0}})).toMatchObject({status:'material',rule:'iodine_lower_estimate'}));
});
