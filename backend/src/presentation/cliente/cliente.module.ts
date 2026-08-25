import { Module } from '@nestjs/common';
import { ClienteController } from './cliente.controller';
import { ClienteUseCases } from '../../application/use-cases/cliente.use-cases';
import { SankhyaClienteRepository } from '../../infrastructure/repositories/sankhya-cliente.repository';
import { SankhyaModule } from '../../infrastructure/sankhya/sankhya.module';

@Module({
  imports: [SankhyaModule],
  controllers: [ClienteController],
  providers: [
    {
      provide: 'IClienteRepository',
      useClass: SankhyaClienteRepository,
    },
    ClienteUseCases,
  ],
  exports: [ClienteUseCases],
})
export class ClienteModule {}