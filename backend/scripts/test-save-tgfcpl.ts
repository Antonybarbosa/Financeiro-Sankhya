import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testSaveTgfcpl() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Testando DatasetSP.save para a entidade ComplementoParceiro / TGFCPL ===\n');

  try {
    const res = await gateway.saveRecord(
      'ComplementoParceiro',
      { CODPARC: 206 },
      ['NUMENTREGA', 'COMPLENTREGA'],
      ['387', 'A'],
    );
    console.log('Sucesso no DatasetSP.save para ComplementoParceiro:');
    console.log(res);
  } catch (err: any) {
    console.error('Erro ao testar ComplementoParceiro:', err?.message || err);
  }
}

testSaveTgfcpl().catch(console.error);
