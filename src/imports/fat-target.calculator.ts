export type FatGoal='maintain'|'weight_loss';
export type FatActivity='low'|'moderate'|'high'|'very_high';
export type FatTargetCalculation={energyKcal:number;weightKg:number;goal:FatGoal;activity:FatActivity;energyPercentMin:number;energyPercentMax:number;targetMinG:number;targetMaxG:number;gramsPerKgMin:number;gramsPerKgMax:number;weightLossGuideStatus:'not_applicable'|'within_50_60'|'below_50'|'above_60'};

const round=(value:number,digits=2)=>Number(value.toFixed(digits));

export function calculateFatTarget(energyKcal:number,weightKg:number,goal:FatGoal,activity:FatActivity):FatTargetCalculation|null {
  if(!Number.isFinite(energyKcal)||energyKcal<800||energyKcal>8000||!Number.isFinite(weightKg)||weightKg<25||weightKg>400)return null;
  if(!['maintain','weight_loss'].includes(goal)||!['low','moderate','high','very_high'].includes(activity))return null;
  const [energyPercentMin,energyPercentMax]=goal==='weight_loss'?[25,30]:activity==='high'||activity==='very_high'?[30,35]:[25,30];
  const targetMinG=round(energyKcal*energyPercentMin/100/9,1),targetMaxG=round(energyKcal*energyPercentMax/100/9,1);
  const midpoint=(targetMinG+targetMaxG)/2;
  return {energyKcal,weightKg,goal,activity,energyPercentMin,energyPercentMax,targetMinG,targetMaxG,gramsPerKgMin:round(targetMinG/weightKg),gramsPerKgMax:round(targetMaxG/weightKg),weightLossGuideStatus:goal!=='weight_loss'?'not_applicable':midpoint<50?'below_50':midpoint>60?'above_60':'within_50_60'};
}
