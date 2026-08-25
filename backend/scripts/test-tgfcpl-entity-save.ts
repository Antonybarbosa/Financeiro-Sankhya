import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testTgfcplEntitySave() {
  const gateway = new SankhyaGateway(new ConfigService());

  const entitiesToTest = [
    'ComplementoParceiro',
    'ParceiroComplemento',
    'TGFCPL',
    'Complemento',
    'Parceiro.Complemento',
    'ParceiroComplementar',
  ];

  console.log('=== Testando entidades do DatasetSP.save para a tabela TGFCPL ===\n');

  for (const entityName of entitiesToTest) {
    console.log(`Testando entityName = "${entityName}"...`);
    try {
      const res = await gateway.saveRecord(
        entityName,
        { CODPARC: 206 },
        ['NUMENTREGA'],
        ['387'],
      );
      console.log(`>>> SUCESSO para "${entityName}":`, res);
      return;
    } catch (err: any) {
      console.log(`--- Falhou para "${entityName}": ${err?.message || err}`);
    }
  }
}

testTgfcplEntitySave().catch(console.error);
