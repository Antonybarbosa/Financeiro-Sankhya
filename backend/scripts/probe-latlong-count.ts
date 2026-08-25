import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 41859;

// Replica EXATA da ordem de campos do repo.update() com dto completo
const FIELDS = ['NOMEPARC', 'RAZAOSOCIAL', 'SITUACAO', 'TELEFONE', 'EMAIL', 'IDENTINSCESTAD', 'PRAZOPAG',
  'LIMCRED', 'OBSERVACOES', 'LIMCREDMENSAL', 'QTDMAXTITVENCIDOS', 'CODTAB', 'CODVEND', 'CODBCO',
  'DESCBONIF', 'DESCFIN', 'INSCMUN', 'RETEMISS', 'RETEMINSS', 'RETEMPIS', 'RETEMCOFINS', 'RETEMCSL',
  'AD_CREDCLI', 'AD_LIMITEPAR', 'AD_LOCALCAD', 'AD_CODBCOBOL', 'SIMPLES', 'PERFILECONECT', 'TIPOFATUR',
  'REGIMEESPTRIBISS', 'TIPCLIENTESERVCOM', 'EMAILNOTIFENTREGA', 'ENTREGAENDCONTATO', 'EXIGCONTATOENTCAB',
  'LATITUDE', 'LONGITUDE', 'DTALTER', 'NUMEND', 'COMPLEMENTO', 'CEP', 'CODCID', 'CODBAI', 'CODEND'];
const VALUES = ['TESTE VALIDACAO UPDATE ALTERADO', 'TESTE VALIDACAO LTDA', 'O', '81999998888', 'validacao@teste.local',
  '123456789', '45', '7890.12', 'VALIDACAO AUTOMATIZADA', '4567.89', '7', '0', '1', '1', 'L', '2.75', '987654321',
  'S', 'S', 'S', 'S', 'S', '123.45', '234.56', 'VALIDACAO', '1', 'S', 'A', 'L', '0', '1',
  'entrega@teste.local', 'S', 'S', '-8.047562', '-34.877002', '21/08/2026 11:30:00', '100', 'APTO VALIDACAO',
  '50750180', '266', '255', '317631'];

const LAT_IDX = FIELDS.indexOf('LATITUDE');
const LONG_IDX = FIELDS.indexOf('LONGITUDE');

async function run(gateway: SankhyaGateway, n: number) {
  const fields = FIELDS.slice(0, n);
  const values = VALUES.slice(0, n);
  // garante lat/long presentes quando n > 35
  await gateway.saveRecord('Parceiro', { CODPARC: CODPARC }, fields, values);
  const row = (await gateway.executeQuery(`SELECT LATITUDE, LONGITUDE FROM TGFPAR WHERE CODPARC = ${CODPARC}`))[0];
  const ok = row.LATITUDE === '-8.047562' && row.LONGITUDE === '-34.877002';
  console.log(`${ok ? 'OK  ' : 'WIPE'} n=${n}: LAT=${row.LATITUDE} LONG=${row.LONGITUDE}`);
}

async function main() {
  const gateway = new SankhyaGateway(new ConfigService());
  console.log(`LAT idx=${LAT_IDX} LONG idx=${LONG_IDX} total=${FIELDS.length}`);
  for (const n of [20, 34, 35, 36, 37, 40, 43]) {
    await run(gateway, n);
  }
}

main().catch(err => { console.error('Erro:', err?.message || err); process.exit(1); });
