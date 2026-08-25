import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import { ConfigService } from '@nestjs/config';

async function main() {
  const configService = { get: (k: string) => process.env[k] } as any as ConfigService;
  const gw = new SankhyaGateway(configService);
  const repo = new SankhyaClienteRepository(gw);

  const CODPARC = 31547;

  console.log('=== Testando atualização do endereço de entrega via CEP da API ===');

  // Simula os dados retornado por ViaCEP/BrasilAPI:
  // "RECIFE (PE)" com o sufixo de estado e logradouro "RUA JUVANDA"
  await repo.update(CODPARC, {
    enderecoEntrega: {
      logradouro: 'RUA JUVANDA',
      numero: '123',
      complemento: 'BL A',
      bairro: 'AFOGADOS',
      cidade: 'RECIFE (PE)',
      uf: 'PE',
      cep: '50750180',
    }
  });

  const cli = await repo.findById(CODPARC);
  console.log('Cliente 31547 retornado após update:', JSON.stringify(cli?.enderecoEntrega, null, 2));

  if (cli?.enderecoEntrega?.cidade === 'RECIFE' && cli?.enderecoEntrega?.cep === '50750180') {
    console.log('✅ SUCESSO: Endereço de entrega preenchido via CEP foi atualizado e lido da TGFCPL perfeitamente!');
  } else {
    console.error('❌ FALHA ao atualizar endereço de entrega');
  }

  process.exit(0);
}

main().catch(console.error);
