import { Module } from '@nestjs/common';
import { SankhyaModule } from '../../infrastructure/sankhya/sankhya.module';
import { SankhyaNfeRepository } from '../../infrastructure/repositories/sankhya-nfe.repository';
import { NfeController } from './nfe.controller';

@Module({
  imports: [SankhyaModule],
  controllers: [NfeController],
  providers: [SankhyaNfeRepository],
})
export class NfeModule {}
