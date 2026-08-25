import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testFindAll() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);

  console.log('=== Testando busca de clientes com repo.findAll() ===\n');

  try {
    const result = await repo.findAll({}, 1, 5);
    console.log(`Sucesso! Retornados ${result.clientes.length} clientes de um total de ${result.total}:`);
    result.clientes.forEach(c => {
      console.log(`- [${c.codParc}] ${c.nomeParc} | End. Formatado: "${c.adEndCompleto}"`);
    });
  } catch (err: any) {
    console.error('Erro ao buscar clientes:', err?.message || err);
  }
}

testFindAll().catch(console.error);
