import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { ConfigService } from '@nestjs/config';

async function main() {
  const gw = new SankhyaGateway({ get: (k: string) => process.env[k] } as any as ConfigService);
  const CODPARC = 206;

  console.log('=== Testando salvar ComplementoParceiro como entidade filha de Parceiro ===');

  // Teste A: CRUDServiceProvider.saveRecord com entidade filha
  try {
    const body = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          dataRow: {
            localFields: {
              CODPARC: String(CODPARC)
            },
            entity: {
              path: 'ComplementoParceiro',
              fieldset: { list: 'CODPARC,NUMENTREGA,CEPENTREGA' },
              dataRow: {
                localFields: {
                  CODPARC: String(CODPARC),
                  NUMENTREGA: '387',
                  CEPENTREGA: '50020040'
                }
              }
            }
          }
        }
      }
    };
    const res = await gw.serviceCall('CRUDServiceProvider.saveRecord', body);
    console.log('✅ CRUDServiceProvider Test A:', JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.log('❌ CRUDServiceProvider Test A:', e.message);
  }

  // Teste B: DatasetSP.save com entityName: 'Parceiro' e records com entidades filhas
  try {
    const body = {
      serviceName: 'DatasetSP.save',
      requestBody: {
        entityName: 'Parceiro',
        standAlone: false,
        fields: ['CODPARC'],
        records: [
          {
            pk: { CODPARC: String(CODPARC) },
            values: { '0': String(CODPARC) },
            entities: {
              entity: [
                {
                  entityName: 'ComplementoParceiro',
                  fields: ['NUMENTREGA', 'CEPENTREGA'],
                  records: [
                    {
                      pk: { CODPARC: String(CODPARC) },
                      values: { '0': '387', '1': '50020040' }
                    }
                  ]
                }
              ]
            }
          }
        ]
      }
    };
    const res = await gw.serviceCall('DatasetSP.save', body);
    console.log('✅ DatasetSP.save Test B:', JSON.stringify(res, null, 2));
  } catch (e: any) {
    console.log('❌ DatasetSP.save Test B:', e.message);
  }

  process.exit(0);
}

main().catch(console.error);
