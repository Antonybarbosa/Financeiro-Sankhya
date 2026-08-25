import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== TESTING ATTACHMENT DELETION ===');

  const methods = ['AnexoSistemaSP.excluir', 'AnexoSistemaSP.excluirAnexo', 'AnexoSistemaSP.deletar', 'AnexoSistemaSP.excluirArquivo'];

  for (const m of methods) {
    try {
      console.log(`\nTesting ${m}...`);
      const res = await gateway.serviceCall(m, {
        serviceName: m,
        requestBody: {
          params: {
            nuAttach: '5',
            keyAttach: '5',
          },
        },
      }, 'mge');
      console.log(`${m} Response:`, JSON.stringify(res, null, 2));
    } catch (err: any) {
      console.log(`${m} Error:`, err?.message || err);
    }
  }

  // Also test DatasetSP.removeRecord for AnexoSistema or TSIANX
  try {
    console.log('\nTesting DatasetSP.removeRecord...');
    const resRemove = await gateway.serviceCall('DatasetSP.removeRecord', {
      serviceName: 'DatasetSP.removeRecord',
      requestBody: {
        dataSetID: '001',
        entityName: 'AnexoSistema',
        pks: [{ NUATTACH: 5 }],
      },
    }, 'mge');
    console.log('DatasetSP.removeRecord Response:', JSON.stringify(resRemove, null, 2));
  } catch (err: any) {
    console.log('DatasetSP.removeRecord Error:', err?.message || err);
  }
}

bootstrap();
