import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { ConfigService } from '@nestjs/config';

async function main() {
  const gw = new SankhyaGateway({ get: (k: string) => process.env[k] } as any as ConfigService);
  const CODPARC = 206;

  console.log('=== Testando a entidade ComplementoParceiro com vários serviços/módulos ===');

  const modules = ['mge', 'mgecom', 'mgefin', 'mgebase'];
  const standAlones = [true, false];

  for (const mod of modules) {
    for (const sa of standAlones) {
      console.log(`\nTesting DatasetSP.save module=${mod}, standAlone=${sa}...`);
      try {
        const body = {
          serviceName: 'DatasetSP.save',
          requestBody: {
            entityName: 'ComplementoParceiro',
            standAlone: sa,
            fields: ['NUMENTREGA', 'CEPENTREGA'],
            records: [
              {
                pk: { CODPARC: String(CODPARC) },
                values: { '0': '387', '1': '50020040' }
              }
            ]
          }
        };
        const res = await gw.serviceCall('DatasetSP.save', body, mod as any);
        console.log(`✅ SUCESSO com module=${mod}, standAlone=${sa}:`, JSON.stringify(res).substring(0, 300));
        process.exit(0);
      } catch (e: any) {
        console.log(`❌ module=${mod}, sa=${sa}: ${e.message}`);
      }
    }
  }

  // Testando CRUDServiceProvider.saveRecord
  console.log('\n--- Testando CRUDServiceProvider.saveRecord ---');
  for (const mod of modules) {
    try {
      const body = {
        serviceName: 'CRUDServiceProvider.saveRecord',
        requestBody: {
          dataSet: {
            rootEntity: 'ComplementoParceiro',
            entity: [{ path: '', fieldset: { list: 'CODPARC,NUMENTREGA,CEPENTREGA' } }],
            dataRow: {
              localFields: { CODPARC: String(CODPARC), NUMENTREGA: '387', CEPENTREGA: '50020040' }
            }
          }
        }
      };
      const res = await gw.serviceCall('CRUDServiceProvider.saveRecord', body, mod as any);
      console.log(`✅ CRUDServiceProvider SUCESSO com module=${mod}:`, JSON.stringify(res).substring(0, 300));
      process.exit(0);
    } catch (e: any) {
      console.log(`❌ CRUDServiceProvider module=${mod}: ${e.message}`);
    }
  }

  process.exit(0);
}

main().catch(console.error);
