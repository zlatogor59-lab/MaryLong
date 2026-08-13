import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { RequestContextMiddleware } from './request-context.middleware';
import { DatabaseModule } from './database/database.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { AuditModule } from './audit/audit.module';
import { MeController } from './me.controller';
import { ImportsModule } from './imports/imports.module';
import { ClientsModule } from './clients/clients.module';

@Module({ imports: [DatabaseModule, AuthModule, AuthorizationModule, AuditModule, ClientsModule, ImportsModule], controllers: [HealthController, MeController] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
