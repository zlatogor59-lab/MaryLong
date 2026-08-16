import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import { PayloadCryptoService } from './payload-crypto.service';

describe('payload crypto service',()=>{
  const originalKey=process.env.PAYLOAD_ENCRYPTION_KEY_BASE64;
  const crypto=new PayloadCryptoService();

  beforeAll(()=>{process.env.PAYLOAD_ENCRYPTION_KEY_BASE64=Buffer.alloc(32,7).toString('base64');});
  afterAll(()=>{
    if(originalKey===undefined)delete process.env.PAYLOAD_ENCRYPTION_KEY_BASE64;
    else process.env.PAYLOAD_ENCRYPTION_KEY_BASE64=originalKey;
  });

  it('round-trips an empty plaintext envelope',async()=>{
    const ciphertext=await crypto.encrypt(Buffer.alloc(0));
    expect(ciphertext).toHaveLength(29);
    await expect(crypto.decrypt(ciphertext)).resolves.toEqual(Buffer.alloc(0));
  });
});
