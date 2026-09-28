import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {loadEnvFile} from 'node:process';
import {catalogVerificationCode,catalogVerificationExitCodes,verifyCatalogDatabase} from './lib/catalog-verification-cli.mjs';

try{loadEnvFile();}catch(error){if(error?.code!=='ENOENT')throw error;}
const reportDirectory=new URL('../.artifacts/',import.meta.url),reportUrl=new URL('food-catalog-verification.json',reportDirectory);
const steps=[
  ['migrations',['prisma:migrate'],{}],
  ['build',['build'],{}],
  ['tests',['test'],{}],
  ['postgresql',['vitest','run','src/imports/food-product-card-versions.database.spec.ts','scripts/lib/catalog-operation-lock.database.spec.mjs'],{RUN_DB_TESTS:'true'}],
  ['version_audit',['food-products:audit-versions'],{}],
  ['browser',['test:browser:catalog'],{}],
];
const startedAt=new Date();
const results=[];let database=null,failedStep=null,errorCode=null;
try{
  database=verifyCatalogDatabase(process.argv.slice(2),process.env.DATABASE_URL);
  const packageManager=process.env.npm_execpath;if(!packageManager)throw new Error('PACKAGE_MANAGER_PATH_REQUIRED');
  for(const [name,args,extraEnv] of steps){
    console.log(`catalog-verification: ${name}`);const stepStarted=Date.now();
    const exitCode=await new Promise(resolve=>{const child=spawn(process.execPath,[packageManager,...args],{cwd:process.cwd(),env:{...process.env,...extraEnv},stdio:'inherit',windowsHide:true});child.once('error',()=>resolve(null));child.once('close',resolve);});
    results.push({name,status:exitCode===0?'passed':'failed',durationMs:Date.now()-stepStarted,exitCode});
    if(exitCode!==0){failedStep=name;break;}
  }
}catch(error){failedStep='configuration';errorCode=/^[A-Z][A-Z0-9_]+/.exec(error instanceof Error?error.message:String(error))?.[0]??'CONFIGURATION_FAILED';
}
const completedAt=new Date(),report={schemaVersion:1,status:failedStep?'failed':'passed',code:catalogVerificationCode(failedStep),database,startedAt:startedAt.toISOString(),completedAt:completedAt.toISOString(),durationMs:completedAt.getTime()-startedAt.getTime(),failedStep,errorCode,steps:results};
await mkdir(reportDirectory,{recursive:true});await writeFile(reportUrl,`${JSON.stringify(report,null,2)}\n`,'utf8');
console.log(JSON.stringify({...report,report:'.artifacts/food-catalog-verification.json'},null,2));
if(failedStep)process.exitCode=catalogVerificationExitCodes[failedStep]??1;
