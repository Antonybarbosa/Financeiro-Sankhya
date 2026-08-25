import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectTsianxTsiataJoin() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== CHECKING RELATION BETWEEN TSIANX AND TSIATA ===\n');

  try {
    // 1. Busca todos os anexos de TSIANX para o parceiro 6614
    const tsianxRows = await gateway.executeQuery(`
      SELECT NUATTACH, NOMEINSTANCIA, PKREGISTRO, NOMEARQUIVO, DESCRICAO, CHAVEARQUIVO, LINK
      FROM TSIANX
      WHERE PKREGISTRO LIKE '6614%' OR NOMEINSTANCIA = 'Parceiro'
    `);
    console.log('TSIANX Rows:');
    console.table(tsianxRows);

    // 2. Busca na TSIATA por NOMEARQUIVO ou por CODATA = NUATTACH
    const nuAttaches = tsianxRows.map((r: any) => r.NUATTACH).join(',');
    const names = tsianxRows.map((r: any) => `'${r.NOMEARQUIVO}'`).join(',');
    const keys = tsianxRows.map((r: any) => `'${r.CHAVEARQUIVO}'`).join(',');

    if (nuAttaches) {
      const matchByCodata = await gateway.executeQuery(`
        SELECT CODATA, TIPO, DESCRICAO, ARQUIVO, TIPOCONTEUDO, LENGTH(CONTEUDO) AS LEN_BYTES
        FROM TSIATA
        WHERE CODATA IN (${nuAttaches})
      `);
      console.log(`\nBusca em TSIATA por CODATA IN (${nuAttaches}):`);
      console.table(matchByCodata);
    }

    if (names) {
      const matchByName = await gateway.executeQuery(`
        SELECT CODATA, TIPO, DESCRICAO, ARQUIVO, TIPOCONTEUDO, LENGTH(CONTEUDO) AS LEN_BYTES
        FROM TSIATA
        WHERE ARQUIVO IN (${names}) OR DESCRICAO IN (${names})
      `);
      console.log(`\nBusca em TSIATA por ARQUIVO/DESCRICAO IN (${names}):`);
      console.table(matchByName);
    }

    // 3. Procura por tabelas de relacionamento contendo ATA e ANX
    const relTables = await gateway.executeQuery(`
      SELECT TABLE_NAME FROM ALL_TABLES WHERE TABLE_NAME LIKE 'TSI%ATA%' OR TABLE_NAME LIKE 'TGF%ATA%'
    `);
    console.log('\nTabelas com ATA:');
    console.table(relTables);

  } catch (err: any) {
    console.error('Error in join inspection:', err?.message || err);
  }
}

inspectTsianxTsiataJoin().catch(console.error);
