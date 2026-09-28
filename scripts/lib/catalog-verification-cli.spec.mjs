import {describe,expect,it} from 'vitest';
import {verifyCatalogDatabase} from './catalog-verification-cli.mjs';

const url='postgresql://user:pass@localhost:5432/catalog_test';
describe('food catalog full verification CLI',()=>{
  it('requires an exact local database confirmation',()=>expect(verifyCatalogDatabase(['--confirm-database=catalog_test'],url)).toBe('catalog_test'));
  it('rejects missing and mismatched confirmation',()=>{expect(()=>verifyCatalogDatabase([],url)).toThrow('CONFIRM_DATABASE_REQUIRED');expect(()=>verifyCatalogDatabase(['--confirm-database=other'],url)).toThrow('CONFIRMED_DATABASE_MISMATCH');});
  it('rejects remote databases and unknown flags',()=>{expect(()=>verifyCatalogDatabase(['--confirm-database=catalog_test'],'postgresql://user:pass@example.com:5432/catalog_test')).toThrow('LOCAL_DATABASE_REQUIRED');expect(()=>verifyCatalogDatabase(['--confirm-database=catalog_test','--force'],url)).toThrow('UNKNOWN_ARGUMENT');});
});
