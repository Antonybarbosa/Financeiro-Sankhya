import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import { ClienteUseCases } from '../src/application/use-cases/cliente.use-cases';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testUpdateClient6614() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);
  const useCases = new ClienteUseCases(repo);

  console.log('=== Teste de Atualização: Cliente #6614 - CEP de Entrega para 50750180 ===\n');

  try {
    const atualizado = await useCases.atualizarCliente(6614, {
      enderecoEntrega: {
        cep: '50750180',
        numero: '79C',
        logradouro: 'RUA COTUNGUBA',
        bairro: 'AFOGADOS',
        cidade: 'RECIFE',
        uf: 'PE',
      },
    });

    console.log('>>> SUCESSO! Cliente #6614 atualizado:');
    console.log({
      codParc: atualizado.codParc,
      nomeParc: atualizado.nomeParc,
      enderecoEntrega: atualizado.enderecoEntrega,
    });
  } catch (err: any) {
    console.error('Erro na atualização:', err?.message || err);
  }
}

testUpdateClient6614().catch(console.error);
