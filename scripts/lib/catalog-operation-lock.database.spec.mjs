import {spawn} from 'node:child_process';
import {loadEnvFile} from 'node:process';
import {PrismaClient} from '@prisma/client';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';

try{loadEnvFile();}catch(error){if(error?.code!=='ENOENT')throw error;}
const run=()=>new Promise(resolve=>{const child=spawn(process.execPath,['scripts/run-food-catalog-operation.mjs','sync-seafood','--apply'],{cwd:process.cwd(),env:process.env,stdio:['ignore','pipe','pipe']});let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);child.on('close',code=>resolve({code,stdout,stderr}));});

describe.runIf(process.env.RUN_DB_TESTS==='true')('food catalog operation PostgreSQL lock',()=>{
  const prisma=new PrismaClient();let createdRunId;
  beforeAll(()=>prisma.$connect());
  afterAll(async()=>{if(createdRunId)await prisma.foodCatalogSyncRun.deleteMany({where:{id:createdRunId}});await prisma.$disconnect();});
  it('rejects a concurrent apply before journaling and releases the lock afterwards',async()=>{
    const before=await prisma.foodCatalogSyncRun.count();
    await prisma.$transaction(async tx=>{
      const lock=await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtext('food-catalog-global-sync-v1')) AS acquired`;
      expect(lock[0]?.acquired).toBe(true);
      const blocked=await run();
      expect(blocked.code).toBe(1);
      expect(JSON.parse(blocked.stderr)).toMatchObject({status:'failed',error:'CATALOG_SYNC_ALREADY_RUNNING'});
      expect(await prisma.foodCatalogSyncRun.count()).toBe(before);
    },{timeout:15_000});
    const completed=await run();
    expect(completed.code).toBe(0);
    const output=JSON.parse(completed.stdout);createdRunId=output.runId;
    expect(output).toMatchObject({status:'ok',integrity:{status:'passed'}});
    expect(await prisma.foodCatalogSyncRun.count()).toBe(before+1);
  });
});
