import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testSaveDeliveryContacts() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Testando DatasetSP.save para Contato do Parceiro (TGFCTT) ===\n');

  try {
    const res = await gateway.saveRecord(
      'Contato',
      { CODPARC: 206, CODCONTATO: 1 },
      ['NOMECONTATO'],
      ['Contato Teste'],
    );
    console.log('Sucesso ao salvar Contato:', res);
  } catch (err: any) {
    console.error('Erro ao testar Contato:', err?.message || err);
  }
}

testSaveDeliveryContacts().catch(console.error);
