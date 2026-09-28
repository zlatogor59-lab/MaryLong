import {spawn} from 'node:child_process';
import {loadEnvFile} from 'node:process';
import {fileURLToPath} from 'node:url';
import {parseCatalogOperationArgs,parseScriptOutput,requireLocalDatabase} from './lib/catalog-operation-cli.mjs';

try{loadEnvFile();}catch(error){if(!(error instanceof Error)||!('code'in error)||error.code!=='ENOENT')throw error;}

const run=(file,args=[])=>new Promise(resolve=>{
  const child=spawn(process.execPath,[file,...args],{cwd:process.cwd(),env:process.env,stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
  child.on('close',code=>resolve({code,stdout,stderr}));child.on('error',error=>resolve({code:1,stdout,stderr:`${stderr}${error.message}`}));
});

let operation='unknown',mode='dry_run';
try{
  const parsed=parseCatalogOperationArgs(process.argv.slice(2));operation=parsed.operation;mode=parsed.mode;
  const database=requireLocalDatabase(process.env.DATABASE_URL);
  const script=fileURLToPath(new URL(parsed.script,import.meta.url));
  const executed=await run(script,parsed.apply?['--apply']:[]);
  if(executed.code!==0)throw new Error(`OPERATION_FAILED:${executed.stderr.trim()||executed.stdout.trim()||executed.code}`);
  const result=parseScriptOutput(executed.stdout);
  let integrity={status:'not_run',reason:'dry_run'};
  if(parsed.apply){
    const audit=await run(fileURLToPath(new URL('audit-food-product-card-versions.mjs',import.meta.url)));
    if(audit.code!==0)throw new Error(`VERSION_AUDIT_FAILED:${audit.stderr.trim()||audit.stdout.trim()||audit.code}`);
    integrity={status:'passed',result:parseScriptOutput(audit.stdout)};
  }
  console.log(JSON.stringify({operation,mode,status:'ok',database,result,integrity},null,2));
}catch(error){
  console.error(JSON.stringify({operation,mode,status:'failed',error:error instanceof Error?error.message:String(error)},null,2));
  process.exitCode=1;
}
