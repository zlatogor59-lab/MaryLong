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
import { AuditModule } from '../audit/audit.module';
import { SubmissionAnalysisController } from './submission-analysis.controller';
import { SubmissionAnalysisService } from './submission-analysis.service';
import { ConsultantNoteController } from './consultant-note.controller';
import { ConsultantNoteService } from './consultant-note.service';
import { ConsultantNoteRepository } from './consultant-note.repository';
import { ConsultationBookingController } from './consultation-booking.controller';
import { ConsultationBookingService } from './consultation-booking.service';
import { ConsultationBookingRepository } from './consultation-booking.repository';
import { ProteinTargetController } from './protein-target.controller';
import { ProteinTargetService } from './protein-target.service';
import { ProteinTargetRepository } from './protein-target.repository';

@Module({ imports:[AuthorizationModule,AuditModule], controllers:[ImportPreviewController,SubmissionWorkflowController,SubmissionHistoryController,SubmissionAnalysisController,ConsultantNoteController,ConsultationBookingController,ProteinTargetController], providers:[ImportPreviewService,SubmissionWorkflowService,SubmissionAnalysisService,ConsultantNoteService,ConsultantNoteRepository,ConsultationBookingService,ConsultationBookingRepository,ProteinTargetService,ProteinTargetRepository,CsvParserService,ImportRateLimiterService,PayloadCryptoService,AssignmentRepository,SubmissionHistoryRepository,
  PrismaSubmissionStore,{provide:SubmissionStore,useExisting:PrismaSubmissionStore}] })
export class ImportsModule {}
