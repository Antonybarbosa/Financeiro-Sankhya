import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== TESTING DatasetSP.save for ANEXO ENTITY ===');

  try {
    const res = await gateway.serviceCall('DatasetSP.save', {
      serviceName: 'DatasetSP.save',
      requestBody: {
        dataSet: {
          rootEntity: 'AnexoSistema',
          includePresentationFields: 'S',
          dataRow: {
            localFields: {
              NOMEINSTANCIA: { $: 'Parceiro' },
              PKREGISTRO: { $: '6614_Parceiro' },
              NOMEARQUIVO: { $: 'documento_teste_dataset.pdf' },
              DESCRICAO: { $: 'Documento Teste Dataset' },
              RESOURCEID: { $: 'br.com.sankhya.core.cad.parceiros' },
              TIPOAPRES: { $: 'LOC' },
              TIPOACESSO: { $: 'ALL' },
            },
          },
        },
      },
    }, 'mge');

    console.log('DatasetSP.save AnexoSistema Result:', JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error('Error testing DatasetSP.save AnexoSistema:', err?.message || err);
  }
}

bootstrap();
