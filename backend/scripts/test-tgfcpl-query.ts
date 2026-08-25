import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testTgfcplQuery() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Testando JOIN entre TGFPAR e TGFCPL (Campos de Entrega Complementares) ===\n');

  const sql = `
    SELECT
      PAR.CODPARC,
      PAR.NOMEPARC,
      CPL.CODENDENTREGA,
      CPL.NUMENTREGA,
      CPL.COMPLENTREGA,
      CPL.CODBAIENTREGA,
      CPL.CODCIDENTREGA,
      CPL.CEPENTREGA,
      CPL.LATITUDEENTREGA,
      CPL.LONGITUDEENTREGA,
      ENDENT.NOMEEND AS LOGRADOURO_ENTREGA,
      BAIENT.NOMEBAI AS BAIRRO_ENTREGA,
      CIDENT.NOMECID AS CIDADE_ENTREGA,
      UFSENT.UF AS UF_ENTREGA
    FROM TGFPAR PAR
    LEFT JOIN TGFCPL CPL ON CPL.CODPARC = PAR.CODPARC
    LEFT JOIN TSIEND ENDENT ON ENDENT.CODEND = CPL.CODENDENTREGA
    LEFT JOIN TSIBAI BAIENT ON BAIENT.CODBAI = CPL.CODBAIENTREGA
    LEFT JOIN TSICID CIDENT ON CIDENT.CODCID = CPL.CODCIDENTREGA
    LEFT JOIN TSIUFS UFSENT ON UFSENT.CODUF = CIDENT.UF
    WHERE ROWNUM <= 10
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.log(`Clientes com TGFCPL retornados (${list.length}):`);
    console.table(list);
  } catch (err: any) {
    console.error('Erro ao consultar TGFCPL:', err?.message || err);
  }
}

testTgfcplQuery().catch(console.error);
