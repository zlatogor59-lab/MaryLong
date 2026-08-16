import { describe,expect,it } from 'vitest';
import { calculateProteinTarget } from './protein-target.calculator';

describe('protein target calculator',()=>{
  it('matches the photographed female BMI 37 ruler row',()=>expect(calculateProteinTarget('Женский',178,117.25)).toMatchObject({bmiRounded:37,proteinFactorG:131,targetMinG:125,targetMaxG:150}));
  it('uses the corrected male BMI 22 value',()=>expect(calculateProteinTarget('Мужской',160,56.32)).toMatchObject({bmiRounded:22,proteinFactorG:87,targetMinG:75,targetMaxG:100}));
  it('matches photographed edge and middle rows',()=>{
    expect(calculateProteinTarget('Женский',150,42.75)?.proteinFactorG).toBe(54);
    expect(calculateProteinTarget('Женский',168,84.67)?.proteinFactorG).toBe(102);
    expect(calculateProteinTarget('Мужской',188,159.05)).toBeNull();
  });
  it('rounds BMI to the nearest integer',()=>{
    expect(calculateProteinTarget('Женский',168,77.60)?.bmiRounded).toBe(27);
    expect(calculateProteinTarget('Женский',168,77.70)?.bmiRounded).toBe(28);
  });
  it('requires manual calculation outside sex, height or BMI scales',()=>{
    expect(calculateProteinTarget('Женский',146,60)).toBeNull();
    expect(calculateProteinTarget('Мужской',194,80)).toBeNull();
    expect(calculateProteinTarget('Не указано',170,70)).toBeNull();
    expect(calculateProteinTarget('Женский',170,140)).toBeNull();
  });
});
