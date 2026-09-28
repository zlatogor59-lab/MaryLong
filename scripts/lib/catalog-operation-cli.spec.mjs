import {describe,expect,it} from 'vitest';
import {catalogOperationErrorCode,catalogSyncHeartbeatIntervalMs,catalogSyncStaleBefore,parseCatalogOperationArgs,parseScriptOutput,requireLocalDatabase,summarizeCatalogOperationResult} from './catalog-operation-cli.mjs';

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
  it('keeps only aggregate counters for the persistent journal',()=>{
    const summary=summarizeCatalogOperationResult([{name:'Secret source row',status:'would_update'},{name:'Another row',status:'would_update'},{mode:'apply',updated:2,products:['a','b']}]);
    expect(summary).toEqual({records:3,updated:2,products:2,statuses:{would_update:2}});
    expect(JSON.stringify(summary)).not.toContain('Secret source row');
  });
  it('reduces failures to a controlled code',()=>{
    expect(catalogOperationErrorCode(new Error('VERSION_AUDIT_FAILED: private output'))).toBe('VERSION_AUDIT_FAILED');
    expect(catalogOperationErrorCode(new Error('lowercase message'))).toBe('UNEXPECTED_ERROR');
  });
  it('uses a five-minute stale heartbeat boundary',()=>{
    expect(catalogSyncHeartbeatIntervalMs).toBeLessThan(5*60_000);
    expect(catalogSyncStaleBefore(new Date('2026-09-28T12:05:00Z')).toISOString()).toBe('2026-09-28T12:00:00.000Z');
  });
});
