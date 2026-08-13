import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class PayloadCryptoService {
  private key() {
    const encoded = process.env.PAYLOAD_ENCRYPTION_KEY_BASE64;
    if (!encoded) throw new Error('PAYLOAD_ENCRYPTION_KEY_BASE64 is required');
    const key = Buffer.from(encoded, 'base64');
    if (key.length !== 32) throw new Error('Payload encryption key must be 32 bytes');
    return key;
  }

  async encrypt(plaintext: Uint8Array): Promise<Uint8Array> {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return Buffer.concat([Buffer.from([1]), iv, cipher.getAuthTag(), ciphertext]);
  }

  async decrypt(payload: Uint8Array): Promise<Uint8Array> {
    const envelope = Buffer.from(payload);
    if (envelope.length < 30 || envelope[0] !== 1) throw new Error('Payload envelope is invalid');
    const decipher = createDecipheriv('aes-256-gcm', this.key(), envelope.subarray(1, 13));
    decipher.setAuthTag(envelope.subarray(13, 29));
    return Buffer.concat([decipher.update(envelope.subarray(29)), decipher.final()]);
  }
}
