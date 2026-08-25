import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { SankhyaModule } from '../../infrastructure/sankhya/sankhya.module';
import { TableInspectorService } from '../../scripts/table-inspector.service';

@Module({
  imports: [SankhyaModule],
  controllers: [HealthController],
  providers: [TableInspectorService],
})
export class HealthModule {}