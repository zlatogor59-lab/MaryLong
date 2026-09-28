import {describe,expect,it} from 'vitest';
import {parseCatalogOperationArgs,parseScriptOutput,requireLocalDatabase} from './catalog-operation-cli.mjs';

describe('food catalog operation CLI',()=>{
  it('uses dry-run by default and requires an explicit apply flag',()=>{
    expect(parseCatalogOperationArgs(['sync-seafood'])).toMatchObject({operation:'sync-seafood',mode:'dry_run',apply:false});
    expect(parseCatalogOperationArgs(['sync-seafood','--apply'])).toMatchObject({mode:'apply',apply:true});
  });
  it('rejects unknown operations and flags',()=>{
    expect(()=>parseCatalogOperationArgs(['unknown'])).toThrow('UNKNOWN_OPERATION');
    expect(()=>parseCatalogOperationArgs(['sync-seafood','--force'])).toThrow('UNKNOWN_ARGUMENT');
  });
  it('normalizes single and line-delimited JSON output',()=>{
    expect(parseScriptOutput('{"mode":"dry_run"}')).toEqual({mode:'dry_run'});
    expect(parseScriptOutput('{"item":1}\n{"item":2}')).toEqual([{item:1},{item:2}]);
  });
  it('allows only a local database',()=>{
    expect(requireLocalDatabase('postgresql://user:pass@localhost:5432/catalog')).toBe('catalog');
    expect(()=>requireLocalDatabase('postgresql://user:pass@example.com/catalog')).toThrow('LOCAL_DATABASE_REQUIRED');
  });
});
