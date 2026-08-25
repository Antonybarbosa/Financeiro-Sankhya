import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const gateway = new SankhyaGateway(new ConfigService());
  const codParc = 41859;

  console.log('=== Probe: LATITUDE/LONGITUDE isolado no CODPARC 41859 ===');
  await gateway.saveRecord('Parceiro', { CODPARC: codParc }, ['LATITUDE', 'LONGITUDE'], ['-8.047562', '-34.877002']);

  const rows = await gateway.executeQuery(`SELECT LATITUDE, LONGITUDE FROM TGFPAR WHERE CODPARC = ${codParc}`);
  console.log('Apos save isolado:', rows[0]);

  console.log('\n=== Probe: DTALTER junto (como no update real) ===');
  await gateway.saveRecord('Parceiro', { CODPARC: codParc }, ['LATITUDE', 'LONGITUDE', 'DTALTER'], ['-8.111222', '-34.333444', '21/08/2026 10:00:00']);
  const rows2 = await gateway.executeQuery(`SELECT LATITUDE, LONGITUDE, DTALTER FROM TGFPAR WHERE CODPARC = ${codParc}`);
  console.log('Apos save com DTALTER:', rows2[0]);

  console.log('\n=== Probe: valores positivos (sem sinal negativo) ===');
  await gateway.saveRecord('Parceiro', { CODPARC: codParc }, ['LATITUDE', 'LONGITUDE'], ['8.047562', '34.877002']);
  const rows3 = await gateway.executeQuery(`SELECT LATITUDE, LONGITUDE FROM TGFPAR WHERE CODPARC = ${codParc}`);
  console.log('Apos save positivo:', rows3[0]);
}

main().catch(err => { console.error('Erro:', err?.message || err); process.exit(1); });
