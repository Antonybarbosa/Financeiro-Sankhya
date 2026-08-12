import { Module } from '@nestjs/common';
import { SankhyaModule } from '../../infrastructure/sankhya/sankhya.module';
import { SankhyaTituloRepository } from '../../infrastructure/repositories/sankhya-titulo.repository';
import { SankhyaContatoRepository } from '../../infrastructure/repositories/sankhya-contato.repository';
import { InMemoryCobrancaRepository } from '../../infrastructure/repositories/in-memory-cobranca.repository';
import { TituloUseCases } from '../use-cases/titulo.use-cases';
import { CobrancaUseCases } from '../use-cases/cobranca.use-cases';
import { ContatoUseCases } from '../use-cases/contato.use-cases';
import { ITituloRepository } from '../../domain/repositories/titulo.repository.interface';
import { ICobrancaRepository } from '../../domain/repositories/cobranca.repository.interface';
import { IContatoRepository } from '../../domain/repositories/contato.repository.interface';

const tituloRepositoryProvider = {
  provide: 'ITituloRepository',
  useClass: SankhyaTituloRepository,
};

const cobrancaRepositoryProvider = {
  provide: 'ICobrancaRepository',
  useClass: InMemoryCobrancaRepository,
};

const contatoRepositoryProvider = {
  provide: 'IContatoRepository',
  useClass: SankhyaContatoRepository,
};

@Module({
  imports: [SankhyaModule],
  providers: [
    tituloRepositoryProvider,
    cobrancaRepositoryProvider,
    contatoRepositoryProvider,
    TituloUseCases,
    CobrancaUseCases,
    ContatoUseCases,
  ],
  exports: [TituloUseCases, CobrancaUseCases, ContatoUseCases],
})
export class CobrancaModule {}
