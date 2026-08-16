export type ProteinTargetCalculation={bmiExact:number;bmiRounded:number;proteinFactorG:number;targetMinG:number;targetMaxG:number};

export function proteinRangeForFactor(proteinFactorG:number):{targetMinG:number;targetMaxG:number}|null {
  if(!Number.isInteger(proteinFactorG)||proteinFactorG<50||proteinFactorG>175)return null;
  if(proteinFactorG<75)return {targetMinG:50,targetMaxG:75};
  if(proteinFactorG<100)return {targetMinG:75,targetMaxG:100};
  if(proteinFactorG<125)return {targetMinG:100,targetMaxG:125};
  if(proteinFactorG<150)return {targetMinG:125,targetMaxG:150};
  return {targetMinG:150,targetMaxG:175};
}

const FEMALE:number[][]=[
  [54,66,80,93],[56,70,82,95],[56,72,85,97],[59,73,85,100],[61,74,88,102],[61,76,89,104],[62,77,92,106],
  [63,78,94,108],[66,81,97,110],[66,82,97,113],[67,84,98,115],[69,84,102,117],[71,87,103,119],
  [72,89,105,121],[74,91,106,124],[74,93,109,126],[76,95,110,128],[77,96,113,129],[80,97,115,131],
  [80,99,117,133],[82,102,118,136],[83,103,120,138],[85,105,122,141],[86,106,125,143],[86,108,126,146],
  [88,109,128,148],[89,111,130,150],
];
const MALE:number[][]=[
  [82,97,107,126],[84,98,113,130],[86,99,115,132],[87,102,118,133],[89,104,119,137],[92,106,122,140],
  [92,107,125,141],[93,110,127,143],[95,110,129,147],[97,114,131,149],[98,115,132,151],[99,118,135,154],
  [102,119,137,157],[104,120,139,159],[105,122,141,162],[107,125,143,162],[109,127,146,165],[110,131,148,169],
  [111,131,150,171],[114,132,152,173],[116,135,153,176],[117,136,155,177],[119,139,159,180],[120,140,161,183],
  [122,141,163,185],[125,143,165,187],[127,146,168,191],
];

export function calculateProteinTarget(sex:string,heightCm:number,weightKg:number):ProteinTargetCalculation|null {
  if(!Number.isFinite(heightCm)||!Number.isFinite(weightKg)||heightCm<=0||weightKg<=0)return null;
  const normalized=sex.toLowerCase();const female=normalized.includes('жен');const male=normalized.includes('муж');
  if(!female&&!male)return null;
  const bands=female?[[147,153],[154,163],[164,173],[174,183]]:[[154,163],[164,173],[174,183],[184,193]];
  const band=bands.findIndex(([min,max])=>heightCm>=min&&heightCm<=max);if(band<0)return null;
  const bmiExact=weightKg/((heightCm/100)**2),bmiRounded=Math.round(bmiExact);if(bmiRounded<19||bmiRounded>45)return null;
  const proteinFactorG=(female?FEMALE:MALE)[bmiRounded-19][band];
  const range=proteinRangeForFactor(proteinFactorG);if(!range)return null;
  return {bmiExact,bmiRounded,proteinFactorG,...range};
}
