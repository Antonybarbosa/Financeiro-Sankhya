import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import { ClienteUseCases } from '../src/application/use-cases/cliente.use-cases';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testGetByIdController() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);
  const useCases = new ClienteUseCases(repo);

  console.log('=== Testando UseCases.buscarPorId(33330) ===\n');

  try {
    const cliente = await useCases.buscarPorId(206);
    console.log('Objeto retornado pelo UseCase:');
    console.log(cliente);
  } catch (err: any) {
    console.error('ERRO ao buscar por ID:', err?.message || err);
  }
}

testGetByIdController().catch(console.error);
