import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function queryParceiroEntrega() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Consultando dados de Entrega na TGFPAR e TGFCTT ===\n');

  const sqlPar = `
    SELECT CODPARC, NOMEPARC, EMAILNOTIFENTREGA, ENTREGAENDCONTATO, EXIGCONTATOENTCAB
    FROM TGFPAR
    WHERE (EMAILNOTIFENTREGA IS NOT NULL OR ENTREGAENDCONTATO = 'S')
      AND ROWNUM <= 5
  `;

  try {
    const resPar = await gateway.executeQuery(sqlPar);
    console.log('Campos de entrega em TGFPAR:');
    console.table(resPar);

    const sqlCtt = `
      SELECT CTT.CODPARC, CTT.CODCONTATO, CTT.NOMECONTATO, CTT.TELEFONE, CTT.EMAIL, CTT.CODEND, CTT.NUMEND, CTT.COMPLEMENTO, CTT.CODBAI, CTT.CODCID, CTT.CEP
      FROM TGFCTT CTT
      WHERE CTT.CODEND IS NOT NULL AND CTT.CODEND > 0
        AND ROWNUM <= 5
    `;
    const resCtt = await gateway.executeQuery(sqlCtt);
    console.log('\nContatos de entrega em TGFCTT:');
    console.table(resCtt);
  } catch (err: any) {
    console.error('Erro na consulta:', err?.message || err);
  }
}

queryParceiroEntrega().catch(console.error);
