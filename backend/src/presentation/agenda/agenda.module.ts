import { Module } from '@nestjs/common';
import { SankhyaModule } from '../../infrastructure/sankhya/sankhya.module';
import { AgendaController } from './agenda.controller';

@Module({
  imports: [SankhyaModule],
  controllers: [AgendaController],
})
export class AgendaModule {}
