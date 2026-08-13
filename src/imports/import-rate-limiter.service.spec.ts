import { describe,expect,it } from 'vitest';
import { ImportRateLimiterService } from './import-rate-limiter.service';
describe('import rate limit',()=>{
  it('SES-005 allows ten imports per minute and rejects the next',()=>{const limiter=new ImportRateLimiterService();for(let i=0;i<10;i++)limiter.check('u:c',1000+i);expect(()=>limiter.check('u:c',1011)).toThrow('RATE_LIMITED');});
  it('expires old attempts',()=>{const limiter=new ImportRateLimiterService();for(let i=0;i<10;i++)limiter.check('u:c',i);expect(()=>limiter.check('u:c',60_001)).not.toThrow();});
});
