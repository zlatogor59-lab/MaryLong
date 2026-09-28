import {describe,expect,it} from 'vitest';
import {calculateFatTarget} from './fat-target.calculator';

describe('fat target calculator',()=>{
  it('uses 25–30% of energy for moderate activity',()=>expect(calculateFatTarget(2000,70,'maintain','moderate')).toMatchObject({energyPercentMin:25,energyPercentMax:30,targetMinG:55.6,targetMaxG:66.7,gramsPerKgMin:.79,gramsPerKgMax:.95}));
  it('uses 30–35% for high energy expenditure',()=>expect(calculateFatTarget(3000,75,'maintain','high')).toMatchObject({energyPercentMin:30,energyPercentMax:35,targetMinG:100,targetMaxG:116.7}));
  it('keeps weight loss energy-based and treats 50–60 g as a check',()=>{
    expect(calculateFatTarget(1800,80,'weight_loss','moderate')?.weightLossGuideStatus).toBe('within_50_60');
    expect(calculateFatTarget(2600,100,'weight_loss','very_high')?.weightLossGuideStatus).toBe('above_60');
  });
  it('rejects implausible or unsupported input',()=>{expect(calculateFatTarget(0,70,'maintain','low')).toBeNull();expect(calculateFatTarget(2000,0,'maintain','low')).toBeNull();});
});
