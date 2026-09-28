import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {PrismaService} from '../database/prisma.service';
import {FoodProductManagementRepository,type FoodProductDraftInput} from './food-product-management.repository';

describe.runIf(process.env.RUN_DB_TESTS==='true')('PostgreSQL food product card version snapshots',()=>{
  const prisma=new PrismaService(),repository=new FoodProductManagementRepository(prisma);
  const admin=randomUUID(),run=randomUUID();
  let cardId:string|undefined;
  const input:FoodProductDraftInput={canonicalName:`DB version test ${run}`,proteinPer100g:3.2,energyKcalPer100g:58,carbohydratePer100g:5,fibrePer100g:0,totalFatPer100g:2.8,origin:'animal',plantSharePercent:0,sourceLabel:'Synthetic source v1',sourceReference:`DB-${run}`,mineralProfile:{calcium:{valuePer100g:120,unit:'mg',status:'analytical',sourceName:'Lab',sourceVersion:'1'}},vitaminProfile:{vitamin_d:{valuePer100g:1.5,unit:'ug',status:'analytical',sourceName:'Lab',sourceVersion:'1'}},enrichmentProfile:{status:'unknown',evidenceBasis:'none',identityScope:'generic',marketCountries:[],nutrients:{},limitation:'Synthetic test'}};

  beforeAll(async()=>{await prisma.$connect();await prisma.$executeRawUnsafe(`INSERT INTO users(id,email_normalized,display_name,role,status,auth_subject) VALUES ('${admin}','food-version-${run}@example.test','Food Version Test','admin','active','food-version-${run}')`);});
  afterAll(async()=>{if(cardId)await prisma.foodProductCard.deleteMany({where:{id:cardId}});await prisma.user.deleteMany({where:{id:admin}});await prisma.$disconnect();});

  it('creates exactly one immutable snapshot for each successful version and none for a conflict',async()=>{
    const created=await repository.create(input,admin);cardId=created.id;
    expect(created.version).toBe(1);
    expect(await prisma.foodProductCardVersion.count({where:{cardId}})).toBe(1);

    const competing=await Promise.all([
      repository.updateDraft(cardId,1,{...input,sourceLabel:'Synthetic source v2-a'},admin),
      repository.updateDraft(cardId,1,{...input,sourceLabel:'Synthetic source v2-b'},admin),
    ]);
    expect(competing.filter(Boolean)).toHaveLength(1);
    expect(await prisma.foodProductCardVersion.count({where:{cardId}})).toBe(2);
    expect((await repository.find(cardId))?.version).toBe(2);

    expect(await repository.updateDraft(cardId,1,{...input,sourceLabel:'Stale update'},admin)).toBeNull();
    expect(await prisma.foodProductCardVersion.count({where:{cardId}})).toBe(2);

    const verified=await repository.verify(cardId,2,admin);
    expect(verified?.version).toBe(3);
    const versions=await prisma.foodProductCardVersion.findMany({where:{cardId},orderBy:{version:'asc'},select:{id:true,version:true,changeKind:true,snapshot:true}});
    expect(versions.map(version=>[version.version,version.changeKind])).toEqual([[1,'CREATE'],[2,'UPDATE'],[3,'VERIFY']]);
    expect((versions[1].snapshot as Record<string,unknown>).sourceLabel).toMatch(/^Synthetic source v2-/);
    expect((versions[2].snapshot as Record<string,unknown>).status).toBe('verified');
    await expect(prisma.foodProductCardVersion.update({where:{id:versions[0].id},data:{changeKind:'TAMPERED'}})).rejects.toThrow();

    await prisma.foodProductCard.update({where:{id:cardId},data:{sourceLabel:`Synthetic service sync-${run}`}});
    const synced=await prisma.foodProductCard.findUniqueOrThrow({where:{id:cardId},select:{version:true}});
    const syncVersion=await prisma.foodProductCardVersion.findUniqueOrThrow({where:{cardId_version:{cardId,version:4}},select:{changeKind:true,snapshot:true}});
    expect(synced.version).toBe(4);
    expect(syncVersion.changeKind).toBe('SYNC');
    expect((syncVersion.snapshot as Record<string,unknown>).sourceLabel).toBe(`Synthetic service sync-${run}`);
    await expect(prisma.foodProductCard.update({where:{id:cardId},data:{version:7}})).rejects.toThrow();
    expect(await prisma.foodProductCardVersion.count({where:{cardId}})).toBe(4);
  });
});
