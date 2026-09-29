import type {DailyRationSnapshotRecord} from './daily-ration-snapshot.repository';

const day=(value:Date)=>value.toISOString().slice(0,10);
const shift=(value:string,days:number)=>{const date=new Date(`${value}T00:00:00Z`);date.setUTCDate(date.getUTCDate()+days);return day(date);};
const round=(value:number)=>Number(value.toFixed(2));
const stats=(values:number[])=>values.length?{average:round(values.reduce((sum,value)=>sum+value,0)/values.length),minimum:Math.min(...values),maximum:Math.max(...values),first:values[0],last:values.at(-1)!,change:values.length>1?round(values.at(-1)!-values[0]):null}:null;

export function calculateWeeklyRationDynamics(snapshots:DailyRationSnapshotRecord[],endDate:string){
  const startDate=shift(endDate,-6),byDate=new Map(snapshots.filter(item=>item.rationDate>=startDate&&item.rationDate<=endDate).map(item=>[item.rationDate,item]));
  const days=Array.from({length:7},(_,index)=>{const rationDate=shift(startDate,index),snapshot=byDate.get(rationDate);return snapshot?{ration_date:rationDate,status:'captured' as const,source_intake_version:snapshot.intakeVersion,summary:{total_protein_g:snapshot.totalProteinG,plant_protein_g:snapshot.plantProteinG,animal_protein_g:snapshot.animalProteinG,completeness_percent:snapshot.completenessPercent}}:{ration_date:rationDate,status:'missing' as const,source_intake_version:null,summary:null};});
  const observed=days.filter(day=>day.status==='captured'),complete=observed.filter(day=>day.summary!.completeness_percent===100),totals=complete.map(day=>day.summary!.total_protein_g),plantShares=complete.filter(day=>day.summary!.total_protein_g>0).map(day=>day.summary!.plant_protein_g/day.summary!.total_protein_g*100);
  return{period:{start_date:startDate,end_date:endDate,calendar_days:7},coverage:{captured_days:observed.length,complete_days:complete.length,missing_days:7-observed.length,coverage_percent:round(observed.length/7*100),average_completeness_percent:observed.length?round(observed.reduce((sum,day)=>sum+day.summary!.completeness_percent,0)/observed.length):null},days,metrics:{total_protein_g:stats(totals),plant_share_percent:stats(plantShares)},interpretation:{status:complete.length<2?'insufficient_data':'observed_days_only',diagnostic_conclusions_generated:false,client_recommendations_generated:false}};
}
