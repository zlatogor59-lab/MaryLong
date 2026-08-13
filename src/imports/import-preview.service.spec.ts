import { beforeEach, describe, expect, it } from 'vitest';
import { ImportPreviewService } from './import-preview.service';
import { SubmissionStore, type SubmissionRecord } from './submission.store';
import { headerFingerprint } from './schema-registry';

const v1 = Array.from({ length: 49 }, (_, i) => `v1-${i}`);
const v2 = Array.from({ length: 76 }, (_, i) => `v2-${i}`);
// Test fixtures use the approved workbook fingerprints without embedding personal or medical values.
const fingerprints = new Map([[headerFingerprint(v1), '614e57efdc0bb2c30eb93081df529c57a5727b15e4e9adda5a72e72949b370dc'], [headerFingerprint(v2), '23af83387ff42b95cda5edb10302cad3e22bf9360112bf7ca669b798c51cda17']]);

class MemoryStore extends SubmissionStore {
  records: SubmissionRecord[] = [];
  findByIdempotencyKey = async (key: string) => this.records.find(x => x.idempotencyKey === key) ?? null;
  findDuplicate = async (source: string | undefined, hash: string) => this.records.find(x => (source && x.sourceResponseId === source) || x.payloadHash === hash) ?? null;
  findById = async (id: string) => this.records.find(x => x.id === id) ?? null;
  create = async (record: SubmissionRecord, _clientId: string) => (this.records.push(record), record);
  transition = async (id:string,from:SubmissionRecord['status'],to:SubmissionRecord['status'],blockCode?:string) => {
    const r=this.records.find(x=>x.id===id&&x.status===from); if(!r)return false; r.status=to; r.blockCode=blockCode as SubmissionRecord['blockCode']; return true;
  };
  transitionWithAudit=async(input:{id:string;fromStatus:SubmissionRecord['status'];toStatus:SubmissionRecord['status'];blockCode?:string})=>
    this.transition(input.id,input.fromStatus,input.toStatus,input.blockCode);
}

// Replace fixture hashes at the registry boundary, retaining strict positional comparison behavior.
import * as registry from './schema-registry';
const identifyFixture = (headers: string[]) => {
  const mapped = fingerprints.get(headerFingerprint(headers));
  return mapped === '614e57efdc0bb2c30eb93081df529c57a5727b15e4e9adda5a72e72949b370dc' ? 'forms_v1_49_columns' :
    mapped === '23af83387ff42b95cda5edb10302cad3e22bf9360112bf7ca669b798c51cda17' ? 'forms_v2_76_columns' : registry.identifySchema(headers);
};

describe('import preview security contract', () => {
  let store: MemoryStore; let service: ImportPreviewService;
  const encrypt = async (x: Uint8Array) => Uint8Array.from(x, b => b ^ 0x5a);
  beforeEach(() => { store = new MemoryStore(); service = new ImportPreviewService(store, identifyFixture); });
  const preview = async (headers: string[], values: unknown[], key: string, source?: string) => {
    return service.preview({ clientId:'00000000-0000-0000-0000-000000000099', headers, values, idempotencyKey: key, sourceResponseId: source, encryptPayload: encrypt });
  };

  it('IMP-001 exact 76 headers are v2 verified', async () => {
    const values = Array(76).fill('synthetic'); values[49] = 'Да';
    expect((await preview(v2, values, 'k1')).status).toBe('verified');
  });
  it('IMP-002 exact v1 without consent is blocked', async () => expect((await preview(v1, Array(49).fill('synthetic'), 'k2')).blockCode).toBe('PRIVACY_NOT_VERIFIED'));
  it('IMP-003 changed header is unknown', async () => { const bad=[...v2]; bad[3]+='!'; await expect(service.preview({clientId:'c',headers:bad,values:Array(76),idempotencyKey:'k3',encryptPayload:encrypt})).rejects.toThrow('SCHEMA_UNKNOWN'); });
  it('IMP-004 swapped semantic columns are unknown', async () => { const bad=[...v2]; [bad[24],bad[30]]=[bad[30],bad[24]]; await expect(service.preview({clientId:'c',headers:bad,values:Array(76),idempotencyKey:'k4',encryptPayload:encrypt})).rejects.toThrow('SCHEMA_UNKNOWN'); });
  it('IMP-005 duplicate source id returns conflict', async () => { const a=Array(76).fill('a');a[49]='Да'; await preview(v2,a,'k5','source-1'); const b=Array(76).fill('b');b[49]='Да'; await expect(preview(v2,b,'k6','source-1')).rejects.toThrow('DUPLICATE_SUBMISSION'); });
  it('IMP-006 same idempotency key returns same record', async () => { const x=Array(76).fill('x');x[49]='Да'; const first=await preview(v2,x,'same'); const second=await preview(v2,x,'same'); expect(second.id).toBe(first.id); expect(store.records).toHaveLength(1); });
  it('IMP-007 payload update is denied by repository', async () => await expect(store.updatePayload()).rejects.toThrow('SUBMISSION_IMMUTABLE'));
  it('IMP-008 payload hash verifies decrypted source', async () => { const values=Array(76).fill('hash');values[49]='Да'; const record=await preview(v2,values,'k8'); expect(service.verifyPayload(record,Buffer.from(JSON.stringify(values)))).toBe(true); });
});
