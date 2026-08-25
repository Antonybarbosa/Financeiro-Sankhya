import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

function formatDateSankhya(d: Date = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
}

async function testUpdateDtalter() {
  const gateway = new SankhyaGateway(new ConfigService());

  const nowFormatted = formatDateSankhya();
  console.log(`=== Testando atualização de DTALTER (${nowFormatted}) ===\n`);

  try {
    // 1. Atualizar DTALTER no Parceiro
    const resPar = await gateway.saveRecord(
      'Parceiro',
      { CODPARC: 6614 },
      ['DTALTER'],
      [nowFormatted],
    );
    console.log('Sucesso ao salvar DTALTER no Parceiro:', resPar);

    // 2. Atualizar DHALTER no Contato
    const resCtt = await gateway.saveRecord(
      'Contato',
      { CODPARC: 6614, CODCONTATO: 1 },
      ['DHALTER'],
      [nowFormatted],
    );
    console.log('Sucesso ao salvar DHALTER no Contato:', resCtt);

  } catch (err: any) {
    console.error('Erro ao testar data de alteração:', err?.message || err);
  }
}

testUpdateDtalter().catch(console.error);
