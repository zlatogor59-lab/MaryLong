import { Module } from '@nestjs/common';
import { AuthorizationPolicy } from './authorization.policy';
@Module({ providers: [AuthorizationPolicy], exports: [AuthorizationPolicy] })
export class AuthorizationModule {}
