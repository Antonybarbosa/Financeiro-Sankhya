import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testSaveDeliveryContatoFull() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Testando DatasetSP.save para a entidade Contato (TGFCTT) ===\n');

  try {
    const res = await gateway.saveRecord(
      'Contato',
      { CODPARC: 206, CODCONTATO: 1 },
      ['CODEND', 'NUMEND', 'COMPLEMENTO', 'CODBAI', 'CODCID', 'CEP', 'NOMECONTATO'],
      ['1156', '387', 'A', '26', '266', '50020040', 'MARCOS SILVA'],
    );
    console.log('Sucesso no DatasetSP.save para Contato:', res);
  } catch (err: any) {
    console.error('Erro ao testar Contato:', err?.message || err);
  }
}

testSaveDeliveryContatoFull().catch(console.error);
