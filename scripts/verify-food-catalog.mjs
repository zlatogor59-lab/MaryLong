import {spawn} from 'node:child_process';
import {loadEnvFile} from 'node:process';
import {verifyCatalogDatabase} from './lib/catalog-verification-cli.mjs';

try{loadEnvFile();}catch(error){if(error?.code!=='ENOENT')throw error;}
const database=verifyCatalogDatabase(process.argv.slice(2),process.env.DATABASE_URL);
const packageManager=process.env.npm_execpath;
if(!packageManager)throw new Error('PACKAGE_MANAGER_PATH_REQUIRED');
const steps=[
  ['migrations',['prisma:migrate'],{}],
  ['build',['build'],{}],
  ['tests',['test'],{}],
  ['postgresql',['vitest','run','src/imports/food-product-card-versions.database.spec.ts','scripts/lib/catalog-operation-lock.database.spec.mjs'],{RUN_DB_TESTS:'true'}],
  ['version_audit',['food-products:audit-versions'],{}],
  ['browser',['test:browser:catalog'],{}],
];
const startedAt=new Date();
for(const [name,args,extraEnv] of steps){
  console.log(`catalog-verification: ${name}`);
  const code=await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[packageManager,...args],{cwd:process.cwd(),env:{...process.env,...extraEnv},stdio:'inherit',windowsHide:true});child.once('error',reject);child.once('close',resolve);});
  if(code!==0)throw new Error(`CATALOG_VERIFICATION_FAILED:${name}`);
}
console.log(JSON.stringify({status:'passed',database,steps:steps.map(([name])=>name),startedAt:startedAt.toISOString(),completedAt:new Date().toISOString()},null,2));
