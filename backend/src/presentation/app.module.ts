import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';

import { SankhyaModule } from '../infrastructure/sankhya/sankhya.module';
import { CobrancaModule } from '../application/cobranca/cobranca.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';
import { AgendaModule } from './agenda/agenda.module';
import { NfeModule } from './nfe/nfe.module';
import { RenegociacaoModule } from './renegociacao/renegociacao.module';
import { HealthController } from './health/health.controller';
import { CobrancaController } from './cobranca/cobranca.controller';
import { AuthController } from './auth/auth.controller';
import { AgendaController } from './agenda/agenda.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    SankhyaModule,
    CobrancaModule,
    AuthModule,
    AgendaModule,
    NfeModule,
    RenegociacaoModule,
  ],
  controllers: [
    HealthController,
    CobrancaController,
    AuthController,
    AgendaController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}