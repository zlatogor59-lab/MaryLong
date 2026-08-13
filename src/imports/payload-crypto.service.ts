import { Injectable } from '@nestjs/common';
import { createCipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class PayloadCryptoService {
  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    const encoded = process.env.PAYLOAD_ENCRYPTION_KEY_BASE64;
    if (!encoded) throw new Error('PAYLOAD_ENCRYPTION_KEY_BASE64 is required');
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32) throw new Error('Payload encryption key must be 32 bytes');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]);
  }
}
