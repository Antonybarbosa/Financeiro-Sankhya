import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testSaveTgfcplParceiroEntity() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Testando se a entidade Parceiro aceita os campos da TGFCPL ===\n');

  try {
    const res = await gateway.saveRecord(
      'Parceiro',
      { CODPARC: 206 },
      ['NUMENTREGA', 'COMPLENTREGA', 'CEPENTREGA'],
      ['387', 'A', '50020040'],
    );
    console.log('Resultado no DatasetSP.save:', res);
  } catch (err: any) {
    console.error('Erro ao testar Parceiro:', err?.message || err);
  }
}

testSaveTgfcplParceiroEntity().catch(console.error);
