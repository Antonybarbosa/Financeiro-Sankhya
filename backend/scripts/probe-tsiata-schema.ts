import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Este script testa a extração do BLOB do anexo #22 (Declaração de autenticidade.jpeg) do parceiro #6614
 * Precisamos primeiro verificar se a TSIATA realmente tem dados para este arquivo no sandbox.
 *
 * A Sankhya normalmente grava o BLOB do arquivo na coluna TSIATA.CONTEUDO quando o upload
 * é feito via sessão do usuário (sessionUpload). Se o upload foi feito apenas via metadado
 * (fileSelect=0), o BLOB não é gravado.
 *
 * Vamos buscar TODOS os registros da TSIATA relacionados ao parceiro 6614 e a qualquer arquivo
 * que possa ser associado.
 */
async function probeAnexo6614Tsiata() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== INVESTIGAÇÃO COMPLETA TSIATA PARA PARCEIRO 6614 ===\n');

  // 1. Todos os registros da TSIATA com conteúdo
  const allTsiata = await gateway.executeQuery(`
    SELECT CODATA, TIPO, DESCRICAO, ARQUIVO, IDENTIFICACAOARQUIVO, LINK,
           DBMS_LOB.GETLENGTH(CONTEUDO) AS LEN, DTALTER
    FROM TSIATA
    ORDER BY CODATA DESC
  `);
  console.log('Todos os registros em TSIATA (incluindo sem BLOB):');
  console.table(allTsiata);

  // 2. Verificar colunas que existem na TSIATA - pode ter uma chave de relacionamento com TSIANX
  const codataValues = allTsiata.map((r: any) => r.CODATA);
  console.log('\nCODATA presentes em TSIATA:', codataValues);

  // 3. Verificar se existe relação entre NUATTACH da TSIANX e CODATA da TSIATA  
  const tsianxAnexos = await gateway.executeQuery(`
    SELECT NUATTACH, PKREGISTRO, NOMEARQUIVO, CHAVEARQUIVO, DHCAD
    FROM TSIANX
    WHERE NOMEINSTANCIA = 'Parceiro'
    ORDER BY NUATTACH
  `);
  console.log('\nTodos os registros em TSIANX (Parceiro):');
  console.table(tsianxAnexos);

  // 4. Tentar buscar pelo CODATA do TSIANX se existir essa coluna
  const codataTsianx = await gateway.executeQuery(`
    SELECT COLUMN_NAME FROM ALL_TAB_COLUMNS 
    WHERE TABLE_NAME = 'TSIANX' AND COLUMN_NAME LIKE 'COD%'
  `).catch(() => []);
  console.log('\nColunas TSIANX que começam com COD:', codataTsianx);

  // 5. Verificar estrutura completa da TSIANX
  const colsTsianx = await gateway.executeQuery(`
    SELECT COLUMN_NAME, DATA_TYPE FROM ALL_TAB_COLUMNS 
    WHERE TABLE_NAME = 'TSIANX' 
    ORDER BY COLUMN_ID
  `).catch(() => []);
  console.log('\nColunas da TSIANX:', colsTsianx);

  // 6. Verificar estrutura completa da TSIATA
  const colsTsiata = await gateway.executeQuery(`
    SELECT COLUMN_NAME, DATA_TYPE FROM ALL_TAB_COLUMNS 
    WHERE TABLE_NAME = 'TSIATA' 
    ORDER BY COLUMN_ID
  `).catch(() => []);
  console.log('\nColunas da TSIATA:', colsTsiata);
}

probeAnexo6614Tsiata().catch(console.error);
