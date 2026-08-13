import { Body, Controller, Headers, HttpStatus, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuthorizationPolicy } from '../authorization/authorization.policy';
import { AssignmentRepository } from './assignment.repository';
import { ImportPreviewService } from './import-preview.service';
import { PayloadCryptoService } from './payload-crypto.service';
import { CsvParserService } from './csv-parser.service';
import { ImportRateLimiterService } from './import-rate-limiter.service';
import { AppError } from '../common/app-error';

interface BodyDto { headers: string[]; values: unknown[]; source_response_id?: string }

@Controller('clients/:clientId/submissions')
export class ImportPreviewController {
  constructor(private readonly imports: ImportPreviewService, private readonly assignments: AssignmentRepository,
    private readonly policy: AuthorizationPolicy, private readonly crypto: PayloadCryptoService,
    private readonly csv:CsvParserService,private readonly rateLimit:ImportRateLimiterService) {}

  @Post('import-preview')
  async preview(@Param('clientId') clientId: string, @Headers('idempotency-key') key: string | undefined,
    @Body() body: BodyDto, @CurrentUser() user: AuthenticatedUser) {
    this.rateLimit.check(`${user.id}:${clientId}`);
    return this.createPreview(clientId,key,body,user);
  }

  @Post('import-preview/csv')
  @UseInterceptors(FileInterceptor('file',{limits:{fileSize:2*1024*1024,files:1}}))
  async previewCsv(@Param('clientId') clientId:string,@Headers('idempotency-key') key:string|undefined,
    @UploadedFile() file:{buffer:Buffer;originalname:string;mimetype:string}|undefined,@Body() body:{source_response_id?:string},
    @CurrentUser() user:AuthenticatedUser) {
    this.rateLimit.check(`${user.id}:${clientId}`);
    if(!file)throw new AppError('CSV_FILE_REQUIRED',HttpStatus.UNPROCESSABLE_ENTITY);
    if(!file.originalname.toLowerCase().endsWith('.csv')&&!['text/csv','application/csv','application/vnd.ms-excel'].includes(file.mimetype))
      throw new AppError('CSV_FILE_TYPE_INVALID',HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    const parsed=this.csv.parseSingleResponse(file.buffer);
    return this.createPreview(clientId,key,{...parsed,source_response_id:body.source_response_id},user);
  }

  private async createPreview(clientId:string,key:string|undefined,body:BodyDto,user:AuthenticatedUser) {
    const assigned = await this.assignments.activeConsultant(clientId);
    this.policy.requireActiveAssignment(user, assigned);
    const record = await this.imports.preview({ clientId, headers:body.headers, values:body.values,
      sourceResponseId:body.source_response_id, idempotencyKey:key ?? '', encryptPayload:x => this.crypto.encrypt(x) });
    return { submission_id:record.id, schema_id:record.schemaId, status:record.status,
      block_code:record.blockCode ?? null, consent_status:record.consentStatus };
  }
}
