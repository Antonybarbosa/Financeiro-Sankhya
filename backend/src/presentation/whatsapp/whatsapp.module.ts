import { Module } from '@nestjs/common';
import { WhatsAppController } from './whatsapp.controller';
import { SankhyaModule } from '../../infrastructure/sankhya/sankhya.module';
import { ClienteModule } from '../cliente/cliente.module';
import { CobrancaModule } from '../../application/cobranca/cobranca.module';

@Module({
  imports: [SankhyaModule, ClienteModule, CobrancaModule],
  controllers: [WhatsAppController],
})
export class WhatsAppModule {}
