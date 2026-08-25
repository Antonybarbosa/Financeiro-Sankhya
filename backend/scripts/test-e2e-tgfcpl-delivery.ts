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

  console.log('=== 1. Testando findById para cliente 31547 ===');
  let cli = await repo.findById(CODPARC);
  console.log('Cliente 31547 antes:', JSON.stringify({
    codParc: cli?.codParc,
    nomeParc: cli?.nomeParc,
    enderecoPrincipal: cli?.endereco,
    enderecoEntrega: cli?.enderecoEntrega,
  }, null, 2));

  console.log('\n=== 2. Testando update de Endereço de Entrega na TGFCPL ===');
  await repo.update(CODPARC, {
    enderecoEntrega: {
      logradouro: 'RUA TESTE ENTREGA TGFCPL',
      numero: '999',
      complemento: 'SALA 101',
      bairro: 'MURIBECA',
      cidade: 'JABOATAO DOS GUARARAPES',
      uf: 'PE',
      cep: '54360465',
      nomeContato: 'CONTATO TESTE CPL',
    }
  });

  cli = await repo.findById(CODPARC);
  console.log('Cliente 31547 depois do update:', JSON.stringify({
    codParc: cli?.codParc,
    nomeParc: cli?.nomeParc,
    enderecoPrincipal: cli?.endereco,
    enderecoEntrega: cli?.enderecoEntrega,
  }, null, 2));

  process.exit(0);
}

main().catch(console.error);
