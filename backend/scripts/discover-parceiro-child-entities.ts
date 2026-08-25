import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function discoverParceiroChildEntities() {
  const gateway = new SankhyaGateway(new ConfigService());

  const pathsToTest = [
    'Complemento',
    'ParceiroComplemento',
    'ComplementoParceiro',
    'TGFCPL',
    'Contato',
    'Endereco',
  ];

  console.log('=== Testando paths de relacionamentos da entidade Parceiro no loadRecord ===\n');

  for (const p of pathsToTest) {
    try {
      const requestBody = {
        serviceName: 'CRUDServiceProvider.loadRecord',
        requestBody: {
          dataSet: {
            rootEntity: 'Parceiro',
            entity: [
              { path: '', fieldset: { list: 'CODPARC, NOMEPARC' } },
              { path: p, fieldset: { list: 'NUMENTREGA, CEPENTREGA' } },
            ],
            rows: {
              row: {
                CODPARC: { $: '206' }
              }
            }
          }
        }
      }
      const res = await gateway.serviceCall('CRUDServiceProvider.loadRecord', requestBody);
      console.log(`>>> SUCESSO para path = "${p}":`, JSON.stringify(res.responseBody, null, 2));
    } catch (err: any) {
      console.log(`--- Falhou para path = "${p}":`, err?.message || err);
    }
  }
}

discoverParceiroChildEntities().catch(console.error);
