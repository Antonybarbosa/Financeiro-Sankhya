import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function discoverParceiroEntityPaths() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Buscando os relacionamentos de entidades (paths) para a rootEntity Parceiro ===\n');

  try {
    const requestBody = {
      serviceName: 'CRUDServiceProvider.loadRecord',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          entity: [
            { path: '', fieldset: { list: 'CODPARC, NOMEPARC' } },
          ],
          rows: {
            row: {
              CODPARC: { $: '206' }
            }
          }
        }
      }
    };

    const res = await gateway.serviceCall('CRUDServiceProvider.loadRecord', requestBody);
    console.log('Resultado loadRecord Parceiro:', JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error('Erro:', err?.message || err);
  }
}

discoverParceiroEntityPaths().catch(console.error);
