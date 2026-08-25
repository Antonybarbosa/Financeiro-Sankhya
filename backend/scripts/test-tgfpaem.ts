import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { ConfigService } from '@nestjs/config';

async function main() {
  const gw = new SankhyaGateway({ get: (k: string) => process.env[k] } as any as ConfigService);

  console.log('--- BUSCANDO REGISTROS DE TGFPAEM ---');
  const rows = await gw.executeQuery(`
    SELECT PAEM.CODPARC, PAEM.CODEMP, EMP.NOMEFANTASIA AS NOMEEMP,
           PAEM.CODVEND, VEND.APELIDO AS NOMEVEND,
           PAEM.CLASSIFICMS, PAEM.CODGRUPONOTIF, PAEM.CODINCINCICMS, PAEM.CODCONV
    FROM TGFPAEM PAEM
    INNER JOIN TSIEMP EMP ON EMP.CODEMP = PAEM.CODEMP
    LEFT JOIN TGFVEN VEND ON VEND.CODVEND = PAEM.CODVEND
    WHERE PAEM.CODPARC = 6614 OR ROWNUM <= 10
  `);
  console.table(rows);

  process.exit(0);
}

main().catch(console.error);
