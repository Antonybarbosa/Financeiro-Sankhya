import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testSqlJoins() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);

  console.log('=== Testando execução da SQL com os novos JOINs ===\n');

  try {
    const result = await repo.findAll({}, 1, 5);
    console.log('Sucesso no repo.findAll()! Total clientes:', result.total);
    console.log('Primeiro cliente retornado:');
    console.log(result.clientes[0]);
  } catch (err: any) {
    console.error('ERRO na consulta SQL:', err?.message || err);
  }
}

testSqlJoins().catch(console.error);
