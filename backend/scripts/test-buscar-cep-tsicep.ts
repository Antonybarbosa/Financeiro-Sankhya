import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import { ConfigService } from '@nestjs/config';

async function main() {
  const gw = new SankhyaGateway({ get: (k: string) => process.env[k] } as any as ConfigService);
  const repo = new SankhyaClienteRepository(gw);

  const cepsToTest = ['50750180', '54360465', '50020040', '01001000'];

  for (const cep of cepsToTest) {
    console.log(`\nConsultando CEP: ${cep}...`);
    const res = await repo.buscarCep(cep);
    console.log(`Resultado para ${cep}:`, JSON.stringify(res, null, 2));
  }

  process.exit(0);
}

main().catch(console.error);
