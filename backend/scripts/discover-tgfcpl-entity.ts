/**
 * Descobre o nome correto da entidade TGFCPL no DatasetSP.save
 * e testa alternativas de gravação.
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { ConfigService } from '@nestjs/config';

async function main() {
  const gw = new SankhyaGateway({ get: (k: string) => process.env[k] } as any as ConfigService);
  const CODPARC = 206; // parceiro de teste

  // Lê valor atual para restaurar depois
  const antes = await gw.executeQuery(`SELECT NUMENTREGA, CEPENTREGA, CODENDENTREGA, CODBAIENTREGA, CODCIDENTREGA FROM TGFCPL WHERE CODPARC = ${CODPARC}`);
  console.log('TGFCPL antes:', JSON.stringify(antes[0] ?? '(sem registro)'));

  const nomes = [
    'ComplementoParceiro',
    'ParceiroComplemento',
    'TGFCPL',
    'Complemento',
    'Parceiro.Complemento',
    'ParceiroComplementar',
    'DadosComplementares',
    'ComplementarParceiro',
    'DadosAdicionais',
    'ParceiroAdicional',
    'EnderecoEntrega',
    'ParceiroEntrega',
  ];

  for (const nome of nomes) {
    try {
      await gw.saveRecord(nome, { CODPARC }, ['NUMENTREGA'], ['999TEST']);
      console.log(`✅ SUCESSO: entidade = "${nome}"`);
      // Restaura
      if (antes[0]) {
        await gw.saveRecord(nome, { CODPARC }, ['NUMENTREGA'], [antes[0].NUMENTREGA || '']);
      }
      process.exit(0);
    } catch (e: any) {
      console.log(`❌ "${nome}": ${e?.message?.split('\n')[0]}`);
    }
  }

  console.log('\n-- Nenhuma entidade funcionou. Verificando se há suporte via executeQuery (SQL UPDATE) --');
  try {
    // Testa se o gateway tem método executeQuery para INSERT/UPDATE
    // (normalmente só suporta SELECT, mas vamos verificar)
    await gw.executeQuery(`UPDATE TGFCPL SET NUMENTREGA = '999TEST' WHERE CODPARC = ${CODPARC} AND ROWNUM = 1`);
    console.log('✅ executeQuery com UPDATE funcionou!');
    await gw.executeQuery(`UPDATE TGFCPL SET NUMENTREGA = '${antes[0]?.NUMENTREGA || ''}' WHERE CODPARC = ${CODPARC}`);
  } catch (e: any) {
    console.log(`❌ executeQuery UPDATE: ${e?.message?.split('\n')[0]}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
