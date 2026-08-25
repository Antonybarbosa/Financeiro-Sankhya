import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { ConfigService } from '@nestjs/config';

function formatDateSankhya(d: Date = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
}

async function main() {
  const gw = new SankhyaGateway({ get: (k: string) => process.env[k] } as any as ConfigService);
  const CODPARC = 31547;

  console.log('=== Testando update via "ComplementoParc.*" na entidade "Parceiro" ===');

  const fields = [
    'CODPARC',
    'DTALTER',
    'ComplementoParc.CODENDENTREGA',
    'ComplementoParc.NUMENTREGA',
    'ComplementoParc.COMPLENTREGA',
    'ComplementoParc.CODBAIENTREGA',
    'ComplementoParc.CODCIDENTREGA',
    'ComplementoParc.CEPENTREGA',
    'ComplementoParc.DTALTER',
  ];

  const values = [
    String(CODPARC),
    formatDateSankhya(),
    '19732',
    '777',
    'SL 302',
    '255',
    '266',
    '50750140',
    formatDateSankhya(),
  ];

  try {
    const res = await gw.saveRecord('Parceiro', { CODPARC: String(CODPARC) }, fields, values);
    console.log('✅ Resultado saveRecord:', JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.log('❌ Erro saveRecord:', e.message);
  }

  const check = await gw.executeQuery(`
    SELECT CPL.CODPARC, CPL.CODENDENTREGA, CPL.NUMENTREGA, CPL.COMPLENTREGA,
           CPL.CODBAIENTREGA, CPL.CODCIDENTREGA, CPL.CEPENTREGA, CPL.DTALTER
    FROM TGFCPL CPL
    WHERE CPL.CODPARC = ${CODPARC}
  `);
  console.log('Conferência banco TGFCPL 31547:', JSON.stringify(check[0], null, 2));

  process.exit(0);
}

main().catch(console.error);
