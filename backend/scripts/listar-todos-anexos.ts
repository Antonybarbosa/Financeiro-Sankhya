import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function listarTodosAnexos() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== TODOS OS ANEXOS DO CODPARC=6614 (TODAS AS TABELAS) ===\n');

  // 1. TSIATA com CODATA=6614 (tipo P)
  console.log('--- TSIATA (CODATA=6614, TIPO=P) ---');
  const tsiataP = await gateway.executeQuery(`
    SELECT CODATA, SEQUENCIA, TIPO, DESCRICAO, ARQUIVO, TIPOCONTEUDO, ENDARQUI,
           DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO_BYTES,
           RAWTOHEX(DBMS_LOB.SUBSTR(CONTEUDO, 4, 1)) AS MAGIC,
           TO_CHAR(DTALTER, 'DD/MM/YYYY HH24:MI') AS DTALTER
    FROM TSIATA
    WHERE CODATA = 6614
    ORDER BY SEQUENCIA
  `);
  if (tsiataP.length > 0) console.table(tsiataP);
  else console.log('  (vazio)\n');

  // 2. TSIANX com PKREGISTRO do parceiro 6614
  console.log('--- TSIANX (parceiro 6614) ---');
  const tsianx = await gateway.executeQuery(`
    SELECT NUATTACH, NOMEINSTANCIA, PKREGISTRO, NOMEARQUIVO, DESCRICAO,
           TIPOACESSO, TIPOAPRES, CHAVEARQUIVO,
           TO_CHAR(DHCAD, 'DD/MM/YYYY HH24:MI') AS DHCAD
    FROM TSIANX
    WHERE (PKREGISTRO = '6614' OR PKREGISTRO = '6614_Parceiro' OR PKREGISTRO LIKE '6614%')
    ORDER BY NUATTACH
  `);
  if (tsianx.length > 0) console.table(tsianx);
  else console.log('  (vazio)\n');

  // 3. Verificar se há outros CODPARC na TSIATA com TIPO='P' que tenham BLOB
  console.log('--- TSIATA com TIPO=P e CONTEUDO preenchido (todos os parceiros) ---');
  const tsiataComBlob = await gateway.executeQuery(`
    SELECT CODATA, SEQUENCIA, DESCRICAO, ARQUIVO, TIPOCONTEUDO,
           DBMS_LOB.GETLENGTH(CONTEUDO) AS TAMANHO_BYTES,
           TO_CHAR(DTALTER, 'DD/MM/YYYY HH24:MI') AS DTALTER
    FROM TSIATA
    WHERE TIPO = 'P' AND CONTEUDO IS NOT NULL AND DBMS_LOB.GETLENGTH(CONTEUDO) > 0
    ORDER BY CODATA, SEQUENCIA
  `);
  if (tsiataComBlob.length > 0) {
    console.table(tsiataComBlob);
  } else {
    console.log('  (nenhum registro de parceiro com BLOB na TSIATA)');
  }

  // 4. Tentar Attach.view usando o CODPARC=41858 que tem BLOB (sequencia=0)
  console.log('\n--- Attach.view para CODPARC=41858 (tem BLOB confirmado) ---');
  try {
    const res = await (gateway as any).serviceCall('Attach.view', {
      serviceName: 'Attach.view',
      requestBody: {
        anexo: {
          codata: 41858,
          sequencia: 0,
          tipo: 'P',
          descricao: 'Documento 2',
          tipoConteudo: 'N',
        },
        clientEventList: {
          clientEvent: [
            { $: 'parceiro.mostra.mensagem.criticaie' },
            { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
          ],
        },
      },
    }, 'mge');
    console.log('  Resposta Attach.view (41858):', JSON.stringify(res?.responseBody || res, null, 2));
  } catch (err: any) {
    console.log('  Erro:', err?.message?.substring(0, 300));
  }

  // 5. Se TSIATA não tem o 6614, os 4 anexos devem estar na TSIANX — vamos listar todos da instância Parceiro
  console.log('\n--- TSIANX: TODOS os parceiros ---');
  const allTsianx = await gateway.executeQuery(`
    SELECT NUATTACH, PKREGISTRO, NOMEARQUIVO, CHAVEARQUIVO, TIPOAPRES,
           TO_CHAR(DHCAD, 'DD/MM/YYYY HH24:MI') AS DHCAD
    FROM TSIANX
    WHERE NOMEINSTANCIA = 'Parceiro'
    ORDER BY NUATTACH DESC
  `);
  if (allTsianx.length > 0) console.table(allTsianx);
  else console.log('  (vazio)');
}

listarTodosAnexos().catch(console.error);
