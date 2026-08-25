import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function searchContactTables() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Buscando tabelas de Contato / Entrega / Endereço no Dicionário ===\n');

  const sql = `
    SELECT NOMETAB, DESCRTAB
    FROM TDDTAB
    WHERE UPPER(NOMETAB) LIKE '%CONT%'
       OR UPPER(NOMETAB) LIKE '%ENTR%'
       OR UPPER(DESCRTAB) LIKE '%CONTATO%'
       OR UPPER(DESCRTAB) LIKE '%ENTREGA%'
    ORDER BY NOMETAB
  `;

  try {
    const res = await gateway.executeQuery(sql);
    console.table(res);
  } catch (err: any) {
    console.error('Erro na busca:', err?.message || err);
  }
}

searchContactTables().catch(console.error);
