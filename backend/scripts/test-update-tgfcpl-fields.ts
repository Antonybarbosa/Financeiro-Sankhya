import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testUpdateTgfcplFields() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Testando sintaxes para atualizar CEPENTREGA em TGFCPL via DatasetSP.save ===\n');

  const syntaxes = [
    { entity: 'Parceiro', fields: ['CEPENTREGA'], values: ['50750180'] },
    { entity: 'Parceiro', fields: ['TGFCPL.CEPENTREGA'], values: ['50750180'] },
    { entity: 'Parceiro', fields: ['Complemento.CEPENTREGA'], values: ['50750180'] },
    { entity: 'Parceiro', fields: ['Parceiro.Complemento.CEPENTREGA'], values: ['50750180'] },
    { entity: 'ComplementoParceiro', fields: ['CEPENTREGA'], values: ['50750180'] },
    { entity: 'ParceiroComplemento', fields: ['CEPENTREGA'], values: ['50750180'] },
    { entity: 'TGFCPL', fields: ['CEPENTREGA'], values: ['50750180'] },
  ];

  for (const s of syntaxes) {
    console.log(`Testando entityName = "${s.entity}", fields = ${JSON.stringify(s.fields)}...`);
    try {
      const res = await gateway.saveRecord(
        s.entity,
        { CODPARC: 6614 },
        s.fields,
        s.values,
      );
      console.log(`>>> SUCESSO com "${s.entity}" (${JSON.stringify(s.fields)}):`, JSON.stringify(res, null, 2));
      return;
    } catch (err: any) {
      console.log(`--- Falhou: ${err?.message || err}`);
    }
  }
}

testUpdateTgfcplFields().catch(console.error);
