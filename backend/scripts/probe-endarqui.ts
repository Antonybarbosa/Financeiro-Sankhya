import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function probeEndarqui() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== VERIFICANDO TSIATA.ENDARQUI (CAMINHO FÍSICO NO DISCO) ===\n');

  // 1. Busca os caminhos físicos de todos os arquivos de parceiros na TSIATA
  const endarqui = await gateway.executeQuery(`
    SELECT CODATA, TIPO, DESCRICAO, ARQUIVO, ENDARQUI, TIPOCONTEUDO,
           DBMS_LOB.GETLENGTH(CONTEUDO) AS LEN_BLOB
    FROM TSIATA
    WHERE TIPO = 'P'
  `);
  console.log('Registros de parceiro (TIPO=P) em TSIATA:');
  console.table(endarqui);

  // 2. Verifica se TSIANX tem LINK ou ENDARQUI que aponte ao caminho físico
  const tsianxLinks = await gateway.executeQuery(`
    SELECT NUATTACH, NOMEINSTANCIA, PKREGISTRO, NOMEARQUIVO, CHAVEARQUIVO, LINK,
           TIPOAPRES
    FROM TSIANX
    ORDER BY NUATTACH DESC
  `);
  console.log('\nRegistros com campo LINK e TIPOAPRES em TSIANX:');
  console.table(tsianxLinks);

  // 3. Verifica parâmetros de configuração do Sankhya (onde os arquivos são armazenados)
  const params = await gateway.executeQuery(`
    SELECT * FROM TSIPRM 
    WHERE DESCRICAO LIKE '%arquivo%' OR DESCRICAO LIKE '%Arquivo%' OR DESCRICAO LIKE '%ARQUIVO%'
    OR CHAVE LIKE '%ARQUV%' OR CHAVE LIKE '%arq%'
  `).catch(() => []);
  console.log('\nParâmetros de configuração de arquivo (TSIPRM):', params);

  // 4. Busca especificamente o registro do NUATTACH=22 (Declaração de autenticidade.jpeg)
  // Verifica se há alguma linha na TSIATA com CODATA relacionado a esse arquivo
  // O CODATA pode ser o NUATTACH ou o CODPARC
  const nuattach22 = await gateway.executeQuery(`
    SELECT CODATA, TIPO, DESCRICAO, ARQUIVO, ENDARQUI, TIPOCONTEUDO,
           DBMS_LOB.GETLENGTH(CONTEUDO) AS LEN_BLOB
    FROM TSIATA
    WHERE CODATA = 22 OR CODATA = 6614 
       OR ARQUIVO LIKE '%autenticidade%'
       OR DESCRICAO LIKE '%autenticidade%'
  `);
  console.log('\nBusca específica por NUATTACH=22 / CODPARC=6614:');
  console.table(nuattach22);
}

probeEndarqui().catch(console.error);
