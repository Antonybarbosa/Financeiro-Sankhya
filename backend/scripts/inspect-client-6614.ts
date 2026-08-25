import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectClient6614() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);

  console.log('=== Inspecionando dados atuais do cliente #6614 ===\n');

  try {
    const cliente = await repo.findById(6614);
    console.log('Dados do cliente #6614 via Repository:');
    console.log(cliente);

    // Verificar se existe registro em TGFCTT para 6614
    const contactsSql = `
      SELECT CODCONTATO, CODPARC, NOMECONTATO, CODEND, NUMEND, COMPLEMENTO, CODBAI, CODCID, CEP
      FROM TGFCTT
      WHERE CODPARC = 6614
    `;
    const contacts = await gateway.executeQuery(contactsSql);
    console.log('\nContatos em TGFCTT para CODPARC = 6614:');
    console.table(contacts);

    // Verificar se existe registro em TGFCPL para 6614
    const cplSql = `
      SELECT CODPARC, CODENDENTREGA, NUMENTREGA, COMPLENTREGA, CODBAIENTREGA, CODCIDENTREGA, CEPENTREGA
      FROM TGFCPL
      WHERE CODPARC = 6614
    `;
    const cpl = await gateway.executeQuery(cplSql);
    console.log('\nComplemento em TGFCPL para CODPARC = 6614:');
    console.table(cpl);

  } catch (err: any) {
    console.error('Erro ao inspecionar 6614:', err?.message || err);
  }
}

inspectClient6614().catch(console.error);
