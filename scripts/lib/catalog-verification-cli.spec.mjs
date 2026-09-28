import {describe,expect,it} from 'vitest';
import {catalogVerificationCode,catalogVerificationExitCodes,verifyCatalogDatabase} from './catalog-verification-cli.mjs';

const url='postgresql://user:pass@localhost:5432/catalog_test';
describe('food catalog full verification CLI',()=>{
  it('requires an exact local database confirmation',()=>expect(verifyCatalogDatabase(['--confirm-database=catalog_test'],url)).toBe('catalog_test'));
  it('rejects missing and mismatched confirmation',()=>{expect(()=>verifyCatalogDatabase([],url)).toThrow('CONFIRM_DATABASE_REQUIRED');expect(()=>verifyCatalogDatabase(['--confirm-database=other'],url)).toThrow('CONFIRMED_DATABASE_MISMATCH');});
  it('rejects remote databases and unknown flags',()=>{expect(()=>verifyCatalogDatabase(['--confirm-database=catalog_test'],'postgresql://user:pass@example.com:5432/catalog_test')).toThrow('LOCAL_DATABASE_REQUIRED');expect(()=>verifyCatalogDatabase(['--confirm-database=catalog_test','--force'],url)).toThrow('UNKNOWN_ARGUMENT');});
  it('keeps stable machine codes for every stage',()=>{expect(catalogVerificationCode()).toBe('PASSED');expect(catalogVerificationCode('version_audit')).toBe('FAILED_VERSION_AUDIT');expect(catalogVerificationExitCodes).toEqual({configuration:2,migrations:10,build:11,tests:12,postgresql:13,version_audit:14,browser:15});});
});
