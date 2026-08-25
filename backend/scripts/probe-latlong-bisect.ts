import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 41859;

async function probe(gateway: SankhyaGateway, nome: string, fields: string[], values: string[]) {
  await gateway.saveRecord('Parceiro', { CODPARC: CODPARC }, fields, values);
  const row = (await gateway.executeQuery(`SELECT LATITUDE, LONGITUDE FROM TGFPAR WHERE CODPARC = ${CODPARC}`))[0];
  const ok = row.LATITUDE === values[0] && row.LONGITUDE === values[1];
  console.log(`${ok ? 'OK  ' : 'WIPE'} ${nome}: LAT=${row.LATITUDE} LONG=${row.LONGITUDE}`);
  return ok;
}

async function main() {
  const gateway = new SankhyaGateway(new ConfigService());

  await probe(gateway, 'P1 SITUACAO', ['LATITUDE', 'LONGITUDE', 'SITUACAO'], ['-8.1000001', '-34.1000001', 'O']);
  await probe(gateway, 'P2 RETEM* flags', ['LATITUDE', 'LONGITUDE', 'RETEMISS', 'RETEMINSS', 'RETEMPIS', 'RETEMCOFINS', 'RETEMCSL'], ['-8.1000002', '-34.1000002', 'S', 'S', 'S', 'S', 'S']);
  await probe(gateway, 'P3 dict campos', ['LATITUDE', 'LONGITUDE', 'SIMPLES', 'PERFILECONECT', 'TIPOFATUR', 'REGIMEESPTRIBISS', 'TIPCLIENTESERVCOM'], ['-8.1000003', '-34.1000003', 'S', 'A', 'L', '0', '1']);
  await probe(gateway, 'P4 dados gerais', ['LATITUDE', 'LONGITUDE', 'NOMEPARC', 'RAZAOSOCIAL', 'TELEFONE', 'EMAIL', 'IDENTINSCESTAD'], ['-8.1000004', '-34.1000004', 'TESTE VALIDACAO UPDATE ALTERADO', 'TESTE VALIDACAO LTDA', '81999998888', 'validacao@teste.local', '123456789']);
  await probe(gateway, 'P5 financeiro', ['LATITUDE', 'LONGITUDE', 'PRAZOPAG', 'LIMCRED', 'LIMCREDMENSAL', 'QTDMAXTITVENCIDOS', 'CODTAB', 'CODVEND', 'CODBCO', 'DESCBONIF', 'DESCFIN'], ['-8.1000005', '-34.1000005', '45', '7890.12', '4567.89', '7', '0', '1', '1', 'L', '2.75']);
  await probe(gateway, 'P6 AD_*', ['LATITUDE', 'LONGITUDE', 'AD_CREDCLI', 'AD_LIMITEPAR', 'AD_LOCALCAD', 'AD_CODBCOBOL'], ['-8.1000006', '-34.1000006', '123.45', '234.56', 'VALIDACAO', '1']);
  await probe(gateway, 'P7 entrega flags', ['LATITUDE', 'LONGITUDE', 'EMAILNOTIFENTREGA', 'ENTREGAENDCONTATO', 'EXIGCONTATOENTCAB'], ['-8.1000007', '-34.1000007', 'entrega@teste.local', 'S', 'S']);
  await probe(gateway, 'P8 DTALTER', ['LATITUDE', 'LONGITUDE', 'DTALTER'], ['-8.1000008', '-34.1000008', '21/08/2026 11:00:00']);
  await probe(gateway, 'P9 endereco completo', ['LATITUDE', 'LONGITUDE', 'NUMEND', 'COMPLEMENTO', 'CEP', 'CODCID', 'CODBAI', 'CODEND'], ['-8.1000009', '-34.1000009', '100', 'APTO VALIDACAO', '50750180', '266', '255', '317631']);
  await probe(gateway, 'P10 INSCMUN+OBS', ['LATITUDE', 'LONGITUDE', 'INSCMUN', 'OBSERVACOES'], ['-8.1000010', '-34.1000010', '987654321', 'VALIDACAO AUTOMATIZADA']);
}

main().catch(err => { console.error('Erro:', err?.message || err); process.exit(1); });
