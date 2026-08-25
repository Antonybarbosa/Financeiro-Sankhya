import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== TESTING AnexoSistemaSP SERVICE CALLS ===');

  try {
    // 1. Query attachments via SQL directly
    const listSql = await gateway.executeQuery(`
      SELECT NUATTACH, NOMEINSTANCIA, PKREGISTRO, NOMEARQUIVO, DESCRICAO, TIPOACESSO, TIPOAPRES, TO_CHAR(DHCAD, 'DD/MM/YYYY HH24:MI:SS') AS DHCAD
      FROM TSIANX
      WHERE NOMEINSTANCIA = 'Parceiro' AND PKREGISTRO LIKE '%6614%'
    `);
    console.log('Anexos do Parceiro 6614 via SQL:', JSON.stringify(listSql, null, 2));

    // 2. Test AnexoSistemaSP.salvar call structure for a test attachment on partner 6614
    const resSalvar = await gateway.serviceCall('AnexoSistemaSP.salvar', {
      serviceName: 'AnexoSistemaSP.salvar',
      requestBody: {
        params: {
          pkEntity: '6614',
          keySession: 'ANEXO_SISTEMA_Parceiro_6614',
          nameEntity: 'Parceiro',
          description: 'Documento Teste API',
          keyAttach: '',
          typeAcess: 'ALL',
          typeApres: 'LOC',
          nuAttach: '',
          nameAttach: 'documento_teste_api.pdf',
          resourceID: 'br.com.sankhya.core.cad.parceiros',
          fileSelect: 1,
          oldFile: '',
        },
      },
    }, 'mge');

    console.log('AnexoSistemaSP.salvar Response:', JSON.stringify(resSalvar, null, 2));

  } catch (err: any) {
    console.error('Error testing AnexoSistemaSP:', err?.message || err);
  }
}

bootstrap();
