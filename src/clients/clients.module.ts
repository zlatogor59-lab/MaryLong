import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsRepository } from './clients.repository';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({ imports:[AuthorizationModule], controllers: [ClientsController], providers: [ClientsRepository] })
export class ClientsModule {}
