import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { ConfigService } from '@nestjs/config';

async function main() {
  const gw = new SankhyaGateway({ get: (k: string) => process.env[k] } as any as ConfigService);

  console.log('=== Buscando mapeamento de TGFCPL no dicionário do Sankhya ===');

  try {
    const tabs = await gw.executeQuery(`
      SELECT NOMETAB, NOMEENTIA, DESCRTAB
      FROM TDDTAB
      WHERE NOMETAB = 'TGFCPL'
    `);
    console.log('TDDTAB:', JSON.stringify(tabs, null, 2));
  } catch (e: any) {
    console.log('Erro TDDTAB:', e.message);
  }

  try {
    const ents = await gw.executeQuery(`
      SELECT NOMEENTIA, DESCRIMPBMP, NOMETAB
      FROM TDDENT
      WHERE NOMETAB = 'TGFCPL' OR NOMEENTIA LIKE '%CPL%' OR NOMEENTIA LIKE '%Complemento%'
    `);
    console.log('TDDENT:', JSON.stringify(ents, null, 2));
  } catch (e: any) {
    console.log('Erro TDDENT:', e.message);
  }
  
  process.exit(0);
}

main().catch(console.error);
