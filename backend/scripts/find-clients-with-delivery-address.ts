import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function findClientsWithDeliveryAddress() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);

  console.log('=== Buscando parceiros no Sankhya que possuem Endereço de Entrega em TGFCTT ===\n');

  const sql = `
    SELECT PAR.CODPARC, PAR.NOMEPARC, CTT.CODEND, CTT.NUMEND, CTT.COMPLEMENTO, CTT.CODBAI, CTT.CODCID, CTT.CEP, CTT.NOMECONTATO
    FROM TGFPAR PAR
    INNER JOIN TGFCTT CTT ON CTT.CODPARC = PAR.CODPARC
    WHERE CTT.CODEND IS NOT NULL AND CTT.CODEND > 0
      AND ROWNUM <= 10
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.log(`Encontrados ${list.length} parceiros com endereço de entrega na TGFCTT:`);
    console.table(list);

    if (list.length > 0) {
      const codParc = parseInt(list[0].CODPARC);
      console.log(`\nBuscando cliente #${codParc} pelo SankhyaClienteRepository...`);
      const cliente = await repo.findById(codParc);
      console.log('Dados do cliente com Endereço de Entrega:');
      console.log(cliente?.enderecoEntrega);
    }
  } catch (err: any) {
    console.error('Erro:', err?.message || err);
  }
}

findClientsWithDeliveryAddress().catch(console.error);
