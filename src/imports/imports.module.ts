import { Module } from '@nestjs/common';
import { ImportPreviewController } from './import-preview.controller';
import { ImportPreviewService } from './import-preview.service';
import { PayloadCryptoService } from './payload-crypto.service';
import { PrismaSubmissionStore } from './prisma-submission.store';
import { SubmissionStore } from './submission.store';
import { AssignmentRepository } from './assignment.repository';
import { SubmissionWorkflowController } from './submission-workflow.controller';
import { SubmissionWorkflowService } from './submission-workflow.service';
import { CsvParserService } from './csv-parser.service';
import { ImportRateLimiterService } from './import-rate-limiter.service';
import { SubmissionHistoryController } from './submission-history.controller';
import { SubmissionHistoryRepository } from './submission-history.repository';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({ imports:[AuthorizationModule], controllers:[ImportPreviewController,SubmissionWorkflowController,SubmissionHistoryController], providers:[ImportPreviewService,SubmissionWorkflowService,CsvParserService,ImportRateLimiterService,PayloadCryptoService,AssignmentRepository,SubmissionHistoryRepository,
  PrismaSubmissionStore,{provide:SubmissionStore,useExisting:PrismaSubmissionStore}] })
export class ImportsModule {}
