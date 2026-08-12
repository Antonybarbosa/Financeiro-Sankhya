import { Module } from '@nestjs/common';
import { SankhyaGateway } from './sankhya.gateway';

@Module({
  providers: [SankhyaGateway],
  exports: [SankhyaGateway],
})
export class SankhyaModule {}