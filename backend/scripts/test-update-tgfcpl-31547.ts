import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { ConfigService } from '@nestjs/config';

function formatDateSankhya(d: Date = new Date()): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  const secs = String(d.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
}

async function main() {
  const gw = new SankhyaGateway({ get: (k: string) => process.env[k] } as any as ConfigService);
  const CODPARC = 31547; // Cliente do teste do usuário!

  console.log('=== Testando update de TGFCPL no cliente 31547 ===');

  const cplFields = [
    'CODENDENTREGA',
    'NUMENTREGA',
    'COMPLENTREGA',
    'CODBAIENTREGA',
    'CODCIDENTREGA',
    'CEPENTREGA',
    'DTALTER',
  ];

  const cplValues = [
    '11011',
    '224',
    'AP 208 BL C QD 4 TESTE',
    '137',
    '5674',
    '54360465',
    formatDateSankhya(),
  ];

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
                fields: cplFields,
                records: [
                  {
                    pk: { CODPARC: String(CODPARC) },
                    values: cplFields.reduce((acc, field, idx) => {
                      acc[idx.toString()] = cplValues[idx];
                      return acc;
                    }, {} as any),
                  },
                ],
              },
            ],
          },
        },
      ],
    },
  };

  const res = await gw.serviceCall('DatasetSP.save', body);
  console.log('Resultado do save:', JSON.stringify(res, null, 2));

  const verificacao = await gw.executeQuery(`
    SELECT CPL.CODPARC, CPL.CODENDENTREGA, CPL.NUMENTREGA, CPL.COMPLENTREGA,
           CPL.CODBAIENTREGA, CPL.CODCIDENTREGA, CPL.CEPENTREGA, CPL.DTALTER
    FROM TGFCPL CPL
    WHERE CPL.CODPARC = ${CODPARC}
  `);
  console.log('Verificação TGFCPL 31547:', JSON.stringify(verificacao[0], null, 2));

  process.exit(0);
}

main().catch(console.error);
