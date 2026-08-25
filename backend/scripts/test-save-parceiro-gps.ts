import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testSaveParceiroGps() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Testando DatasetSP.save para LATITUDE, LONGITUDE e EMAILNOTIFENTREGA na entidade Parceiro ===\n');

  try {
    const res = await gateway.saveRecord(
      'Parceiro',
      { CODPARC: 206 },
      ['EMAILNOTIFENTREGA', 'LATITUDE', 'LONGITUDE'],
      ['palmec@uol.com.br', '-8.0662383', '-34.8809891'],
    );
    console.log('Sucesso ao salvar GPS e E-mail no Parceiro:', res);
  } catch (err: any) {
    console.error('Erro ao salvar Parceiro:', err?.message || err);
  }
}

testSaveParceiroGps().catch(console.error);
