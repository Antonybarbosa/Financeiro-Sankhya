import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function probeTsiataMatchAll() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== SEARCHING ALL ROWS IN TSIATA WITH CONTEUDO ===\n');

  try {
    // 1. Busca todas as linhas de TSIATA que tenham CONTEUDO preenchido (BLOB > 0)
    const rowsWithBlob = await gateway.executeQuery(`
      SELECT CODATA, TIPO, DESCRICAO, ARQUIVO, IDENTIFICACAOARQUIVO, LINK,
             DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO_BYTES, DTALTER
      FROM TSIATA
      WHERE CONTEUDO IS NOT NULL AND DBMS_LOB.GETLENGTH(CONTEUDO) > 0
    `);

    console.log(`Linhas em TSIATA com CONTEUDO BLOB preenchido (${rowsWithBlob.length}):`);
    console.table(rowsWithBlob);

    // 2. Busca na TSIANX para comparar os nomes de arquivo e chaves
    const tsianxRows = await gateway.executeQuery(`
      SELECT NUATTACH, NOMEINSTANCIA, PKREGISTRO, NOMEARQUIVO, DESCRICAO, CHAVEARQUIVO
      FROM TSIANX
    `);
    console.log(`\nLinhas em TSIANX (${tsianxRows.length}):`);
    console.table(tsianxRows);

  } catch (err: any) {
    console.error('Error probing TSIATA:', err?.message || err);
  }
}

probeTsiataMatchAll().catch(console.error);
