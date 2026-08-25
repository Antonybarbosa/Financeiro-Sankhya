import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());
  try {
    const res = await gateway.serviceCall('DatasetSP.removeRecord', {
      serviceName: 'DatasetSP.removeRecord',
      requestBody: {
        dataSetID: '001',
        entityName: 'AnexoSistema',
        standAlone: false,
        pks: [{ NUATTACH: 8 }],
        ignoreListenerMethods: '',
      },
    });
    console.log('removeRecord:', JSON.stringify(res?.responseBody || res).slice(0, 300));
    const chk = await gateway.executeQuery('SELECT NUATTACH, NOMEARQUIVO FROM TSIANX ORDER BY NUATTACH');
    console.log('restam:', JSON.stringify(chk));
  } catch (e: any) {
    console.error('ERR:', e.message);
  }
}

bootstrap();
