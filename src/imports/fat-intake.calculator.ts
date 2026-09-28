export type FatProductSnapshot = {
  id: string; name: string; carbohydratePer100g: number | null; fibrePer100g: number | null; totalSugarsPer100g: number | null; freeSugarsPer100g: number | null; carbohydrateSourceClass: string | null; totalFatPer100g: number | null;
  saturatedFatPer100g: number | null; monounsaturatedFatPer100g: number | null;
  polyunsaturatedFatPer100g: number | null; transFatPer100g: number | null;
  omega6TotalPer100g: number | null; omega3TotalPer100g: number | null;
  omega6LaPer100g: number | null; omega3AlaPer100g: number | null;
  epaPer100g: number | null; dhaPer100g: number | null; palmiticAcidPer100g: number | null; version: number;
};
export type FatIntakeInput = {mealKey: string; productCardId: string; massG: number};
const fields = ['carbohydratePer100g','fibrePer100g','totalSugarsPer100g','freeSugarsPer100g','totalFatPer100g','saturatedFatPer100g','monounsaturatedFatPer100g','polyunsaturatedFatPer100g','transFatPer100g','omega6TotalPer100g','omega3TotalPer100g','omega6LaPer100g','omega3AlaPer100g','epaPer100g','dhaPer100g','palmiticAcidPer100g'] as const;
const round = (n: number, d = 2) => Number(n.toFixed(d));

export function calculateFatIntake(inputs: FatIntakeInput[], products: Map<string,FatProductSnapshot>, energyKcal: number | null, targetMinG: number | null = null, targetMaxG: number | null = null) {
  const totals = Object.fromEntries(fields.map(f => [f,0])) as Record<typeof fields[number],number>;
  const known = Object.fromEntries(fields.map(f => [f,0])) as Record<typeof fields[number],number>;
  const lines: any[] = [], unresolved: any[] = []; let preferredCarbohydrateG=0,sourceClassKnown=0;
  inputs.forEach((input,index) => {
    const product = products.get(input.productCardId);
    if (!product) { unresolved.push({index,reason:'PRODUCT_NOT_VERIFIED'}); return; }
    if (!Number.isFinite(input.massG) || input.massG <= 0 || input.massG > 5000) { unresolved.push({index,reason:'MASS_INVALID'}); return; }
    const nutrients: any = {};
    fields.forEach(field => { const value=product[field]; nutrients[field]=value===null?null:input.massG*value/100; if(value!==null){totals[field]+=nutrients[field];known[field]++;} });
    if(product.carbohydrateSourceClass){sourceClassKnown++;if(product.carbohydrateSourceClass==='preferred_source'&&nutrients.carbohydratePer100g!==null)preferredCarbohydrateG+=nutrients.carbohydratePer100g;}
    lines.push({...input,product,nutrients});
  });
  const count=inputs.length, completeness=Object.fromEntries(fields.map(f=>[f,count?Math.round(known[f]/count*100):0]));
  const energyShare=(field:typeof fields[number],factor:number)=>energyKcal&&known[field]===count?totals[field]*factor/energyKcal*100:null;
  const carbohydrateEnergyPercent=energyShare('carbohydratePer100g',4),freeSugarsEnergyPercent=energyShare('freeSugarsPer100g',4),sfaEnergyPercent=energyShare('saturatedFatPer100g',9),transEnergyPercent=energyShare('transFatPer100g',9),laEnergyPercent=energyShare('omega6LaPer100g',9),alaEnergyPercent=energyShare('omega3AlaPer100g',9);
  const epaDhaMg=(totals.epaPer100g+totals.dhaPer100g)*1000,omega3Specific=totals.omega3AlaPer100g+totals.epaPer100g+totals.dhaPer100g;
  const hasTotals=known.omega6TotalPer100g===count&&known.omega3TotalPer100g===count,hasSpecific=known.omega6LaPer100g===count&&known.omega3AlaPer100g===count&&known.epaPer100g===count&&known.dhaPer100g===count;
  const omegaRatio=hasTotals&&totals.omega3TotalPer100g?totals.omega6TotalPer100g/totals.omega3TotalPer100g:hasSpecific&&omega3Specific?totals.omega6LaPer100g/omega3Specific:null;
  const palmiticShare=totals.totalFatPer100g&&known.palmiticAcidPer100g===count&&known.totalFatPer100g===count?totals.palmiticAcidPer100g/totals.totalFatPer100g*100:null;
  const palmiticHighCarb=palmiticShare===null||carbohydrateEnergyPercent===null?'not_assessed':palmiticShare>15&&carbohydrateEnergyPercent>60?'research_attention_total_carbohydrate':'not_detected';
  const fatBalance=targetMinG===null||targetMaxG===null?{status:'target_not_set',targetMinG,targetMaxG,differenceG:null,differencePercent:null}:known.totalFatPer100g!==count||unresolved.length?{status:'insufficient_data',targetMinG,targetMaxG,differenceG:null,differencePercent:null}:totals.totalFatPer100g<targetMinG?{status:'below_range',targetMinG,targetMaxG,differenceG:round(targetMinG-totals.totalFatPer100g),differencePercent:round((targetMinG-totals.totalFatPer100g)/targetMinG*100)}:totals.totalFatPer100g>targetMaxG?{status:'above_range',targetMinG,targetMaxG,differenceG:round(totals.totalFatPer100g-targetMaxG),differencePercent:round((totals.totalFatPer100g-targetMaxG)/targetMaxG*100)}:{status:'within_range',targetMinG,targetMaxG,differenceG:0,differencePercent:0};
  return {lines,unresolved,fatBalance,totals:Object.fromEntries(fields.map(f=>[f,round(totals[f])])),completeness,
    carbohydrateEnergyPercent:carbohydrateEnergyPercent===null?null:round(carbohydrateEnergyPercent),freeSugarsEnergyPercent:freeSugarsEnergyPercent===null?null:round(freeSugarsEnergyPercent),preferredCarbohydrateSharePercent:sourceClassKnown===count&&known.carbohydratePer100g===count&&totals.carbohydratePer100g?round(preferredCarbohydrateG/totals.carbohydratePer100g*100):null,sfaEnergyPercent:sfaEnergyPercent===null?null:round(sfaEnergyPercent),transEnergyPercent:transEnergyPercent===null?null:round(transEnergyPercent),laEnergyPercent:laEnergyPercent===null?null:round(laEnergyPercent),alaEnergyPercent:alaEnergyPercent===null?null:round(alaEnergyPercent),epaDhaMg:known.epaPer100g===count&&known.dhaPer100g===count?round(epaDhaMg):null,omega6ToOmega3Ratio:omegaRatio===null?null:round(omegaRatio),palmiticSharePercent:palmiticShare===null?null:round(palmiticShare),
    signals:{carbohydrate:carbohydrateEnergyPercent===null?'insufficient_data':carbohydrateEnergyPercent>60?'above_reference_range':carbohydrateEnergyPercent<45?'below_reference_range':'within_reference_range',fibre:known.fibrePer100g!==count?'insufficient_data':totals.fibrePer100g<25?'below_guide':'guide_met',freeSugars:freeSugarsEnergyPercent===null?'insufficient_data':freeSugarsEnergyPercent>=10?'red_flag':freeSugarsEnergyPercent>5?'within_guide':'preferred_guide_met',carbohydrateSources:sourceClassKnown===count?'descriptive_available':'insufficient_data',saturated:sfaEnergyPercent===null?'insufficient_data':sfaEnergyPercent>10?'red_flag':'within_guide',trans:transEnergyPercent===null?'insufficient_data':transEnergyPercent>1?'red_flag':'within_guide',omega6La:laEnergyPercent===null?'insufficient_data':laEnergyPercent<4?'below_guide':'guide_met',omega3Ala:alaEnergyPercent===null?'insufficient_data':alaEnergyPercent<.5?'below_guide':'guide_met',epaDha:known.epaPer100g!==count||known.dhaPer100g!==count?'insufficient_data':epaDhaMg<250?'below_guide':'guide_met',palmitic:palmiticShare===null?'insufficient_data':palmiticShare>15?'research_attention':'within_internal_threshold',palmiticHighCarb}};
}
