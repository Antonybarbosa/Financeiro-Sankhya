import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import { ClienteUseCases } from '../src/application/use-cases/cliente.use-cases';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testUpdateDelivery() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);
  const useCases = new ClienteUseCases(repo);

  console.log('=== Testando update de cliente com campos de entrega e DTOs validados ===\n');

  try {
    const res = await useCases.atualizarCliente(206, {
      emailNotifEntrega: 'palmec@uol.com.br',
      latitude: '-8.0662383',
      longitude: '-34.8809891',
      enderecoEntrega: {
        codEnd: 1156,
        numero: '387',
        complemento: 'A',
        codBai: 26,
        codCid: 266,
        cep: '50020040',
      },
    });

    console.log('Atualização realizada com sucesso!');
    console.log('Cliente atualizado:', {
      codParc: res.codParc,
      nomeParc: res.nomeParc,
      emailNotifEntrega: res.emailNotifEntrega,
      latitude: res.latitude,
      longitude: res.longitude,
      enderecoEntrega: res.enderecoEntrega,
    });
  } catch (err: any) {
    console.error('Erro na atualização:', err?.message || err);
  }
}

testUpdateDelivery().catch(console.error);
