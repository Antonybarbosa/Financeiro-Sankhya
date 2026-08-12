import { Module } from '@nestjs/common';
import { SankhyaModule } from '../../infrastructure/sankhya/sankhya.module';
import { SankhyaRenegociacaoRepository } from '../../infrastructure/repositories/sankhya-renegociacao.repository';
import { RenegociacaoUseCases } from '../../application/use-cases/renegociacao.use-cases';
import { RenegociacaoController } from './renegociacao.controller';

@Module({
  imports: [SankhyaModule],
  controllers: [RenegociacaoController],
  providers: [SankhyaRenegociacaoRepository, RenegociacaoUseCases],
})
export class RenegociacaoModule {}
