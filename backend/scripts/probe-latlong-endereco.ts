import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const gateway = new SankhyaGateway(new ConfigService());
  const codParc = 41859;

  console.log('=== Probe A: LAT/LONG + CEP na mesma transacao ===');
  await gateway.saveRecord(
    'Parceiro', { CODPARC: codParc },
    ['LATITUDE', 'LONGITUDE', 'CEP'],
    ['-8.111111', '-34.222222', '50750180'],
  );
  console.log('Resultado:', JSON.stringify((await gateway.executeQuery(`SELECT LATITUDE, LONGITUDE, CEP FROM TGFPAR WHERE CODPARC = ${codParc}`))[0]));

  console.log('\n=== Probe B: LAT/LONG + CODEND/CODBAI/CODCID ===');
  await gateway.saveRecord(
    'Parceiro', { CODPARC: codParc },
    ['LATITUDE', 'LONGITUDE', 'CODEND', 'CODBAI', 'CODCID'],
    ['-8.333333', '-34.444444', '317631', '255', '266'],
  );
  console.log('Resultado:', JSON.stringify((await gateway.executeQuery(`SELECT LATITUDE, LONGITUDE, CODEND, CODBAI, CODCID FROM TGFPAR WHERE CODPARC = ${codParc}`))[0]));

  console.log('\n=== Probe C: LAT/LONG + EMAILNOTIFENTREGA (sem endereco) ===');
  await gateway.saveRecord(
    'Parceiro', { CODPARC: codParc },
    ['LATITUDE', 'LONGITUDE', 'EMAILNOTIFENTREGA'],
    ['-8.555555', '-34.666666', 'probe@teste.local'],
  );
  console.log('Resultado:', JSON.stringify((await gateway.executeQuery(`SELECT LATITUDE, LONGITUDE, EMAILNOTIFENTREGA FROM TGFPAR WHERE CODPARC = ${codParc}`))[0]));
}

main().catch(err => { console.error('Erro:', err?.message || err); process.exit(1); });
