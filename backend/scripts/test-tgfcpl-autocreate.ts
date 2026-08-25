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
  
  // Testando com um parceiro aleatorio
  const testPar = await gw.executeQuery(`
    SELECT PAR.CODPARC
    FROM TGFPAR PAR
    LEFT JOIN TGFCPL CPL ON CPL.CODPARC = PAR.CODPARC
    WHERE CPL.CODPARC IS NULL AND ROWNUM <= 1
  `);

  if (testPar.length === 0) {
    console.log('Todos os parceiros testados possuem TGFCPL');
    process.exit(0);
  }

  const codParc = parseInt(testPar[0].CODPARC);
  console.log(`Testando parceiro sem TGFCPL previa: CODPARC = ${codParc}`);

  const cplFields = ['NUMENTREGA', 'CEPENTREGA', 'DTALTER'];
  const cplValues = ['123TEST', '50750140', formatDateSankhya()];

  const body = {
    serviceName: 'DatasetSP.save',
    requestBody: {
      entityName: 'Parceiro',
      standAlone: false,
      fields: ['CODPARC'],
      records: [
        {
          pk: { CODPARC: String(codParc) },
          values: { '0': String(codParc) },
          entities: {
            entity: [
              {
                entityName: 'ComplementoParceiro',
                fields: cplFields,
                records: [
                  {
                    pk: { CODPARC: String(codParc) },
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
  console.log('Resultado:', JSON.stringify(res, null, 2));

  const check = await gw.executeQuery(`SELECT * FROM TGFCPL WHERE CODPARC = ${codParc}`);
  console.log('TGFCPL criado:', JSON.stringify(check[0], null, 2));

  process.exit(0);
}

main().catch(console.error);
