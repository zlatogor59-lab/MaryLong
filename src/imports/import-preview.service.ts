import { HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { consentVerified, headerFingerprint, identifySchema } from './schema-registry';
import { SubmissionStore, type SubmissionRecord } from './submission.store';
import { AppError } from '../common/app-error';

export interface ImportPreviewInput {
  clientId: string; headers: string[]; values: unknown[]; sourceResponseId?: string; idempotencyKey: string;
  encryptPayload: (plaintext: Uint8Array) => Promise<Uint8Array>;
}

@Injectable()
export class ImportPreviewService {
  private readonly schemaIdentifier: typeof identifySchema;
  constructor(private readonly store: SubmissionStore,
    @Optional() @Inject('SCHEMA_IDENTIFIER') schemaIdentifier?: typeof identifySchema) {
    this.schemaIdentifier = schemaIdentifier ?? identifySchema;
  }

  async preview(input: ImportPreviewInput): Promise<SubmissionRecord> {
    const replay = await this.store.findByIdempotencyKey(input.idempotencyKey);
    if (replay) return replay;
    if (!input.idempotencyKey.trim()) throw new AppError('IDEMPOTENCY_KEY_REQUIRED', HttpStatus.UNPROCESSABLE_ENTITY);
    if (input.headers.length !== input.values.length) throw new AppError('ROW_WIDTH_MISMATCH', HttpStatus.UNPROCESSABLE_ENTITY);
    const schemaId = this.schemaIdentifier(input.headers);
    if (!schemaId) throw new AppError('SCHEMA_UNKNOWN', HttpStatus.UNPROCESSABLE_ENTITY);
    const plaintext = Buffer.from(JSON.stringify(input.values), 'utf8');
    const payloadHash = createHash('sha256').update(plaintext).digest('hex');
    if (await this.store.findDuplicate(input.sourceResponseId, payloadHash)) throw new AppError('DUPLICATE_SUBMISSION', HttpStatus.CONFLICT);
    const verified = consentVerified(schemaId, input.values);
    const record: SubmissionRecord = {
      id: randomUUID(), clientId: input.clientId, sourceResponseId: input.sourceResponseId, idempotencyKey: input.idempotencyKey, schemaId,
      headerFingerprint: headerFingerprint(input.headers), payloadHash, payloadCiphertext: await input.encryptPayload(plaintext),
      status: verified ? 'verified' : 'blocked', blockCode: verified ? undefined : 'PRIVACY_NOT_VERIFIED',
      consentStatus: verified ? 'verified' : 'not_verified',
    };
    return this.store.create(record, input.clientId);
  }

  verifyPayload(record: SubmissionRecord, decryptedPlaintext: Uint8Array): boolean {
    return createHash('sha256').update(decryptedPlaintext).digest('hex') === record.payloadHash;
  }
}
