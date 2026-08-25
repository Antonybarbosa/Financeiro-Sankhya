import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());
  const sessionKey = `ANEXO_SISTEMA_Parceiro_${CODPARC}`;

  console.log('A) uploadSessionFile do gateway (pdf)...');
  const pdf = Buffer.from('%PDF-1.4 teste gateway\n%%EOF\n', 'utf-8');
  await gateway.uploadSessionFile(sessionKey, 'teste_gw.pdf', pdf, 'application/pdf');
  console.log('   upload OK (sem exceção)');

  console.log('B) salvar raw via serviceCall...');
  try {
    const r = await gateway.serviceCall('AnexoSistemaSP.salvar', {
      serviceName: 'AnexoSistemaSP.salvar',
      requestBody: {
        params: {
          pkEntity: String(CODPARC),
          keySession: sessionKey,
          nameEntity: 'Parceiro',
          description: 'Teste GW PDF',
          keyAttach: '',
          typeAcess: 'ALL',
          typeApres: 'LOC',
          nuAttach: '',
          nameAttach: 'teste_gw.pdf',
          resourceID: 'br.com.sankhya.core.cad.parceiros',
          fileSelect: 1,
          oldFile: '',
        },
      },
    });
    console.log('   salvar OK:', JSON.stringify(r?.responseBody?.chave || r?.responseBody));
    const nu = parseInt(r?.responseBody?.chave?.valor, 10);
    if (nu) {
      await gateway.serviceCall('DatasetSP.removeRecord', {
        serviceName: 'DatasetSP.removeRecord',
        requestBody: { dataSetID: '001', entityName: 'AnexoSistema', standAlone: false, pks: [{ NUATTACH: nu }], ignoreListenerMethods: '' },
      });
      console.log('   cleanup OK');
    }
  } catch (e: any) {
    console.log('   salvar FALHOU:', e.message);
  }

  console.log('\nC) mesmo fluxo com octet-stream + .txt (idêntico ao probe que funciona)...');
  const txt = Buffer.from('conteudo txt\n', 'utf-8');
  await gateway.uploadSessionFile(sessionKey, 'teste_gw.txt', txt, 'application/octet-stream');
  console.log('   upload OK');
  try {
    const r = await gateway.serviceCall('AnexoSistemaSP.salvar', {
      serviceName: 'AnexoSistemaSP.salvar',
      requestBody: {
        params: {
          pkEntity: String(CODPARC),
          keySession: sessionKey,
          nameEntity: 'Parceiro',
          description: 'Teste GW TXT',
          keyAttach: '',
          typeAcess: 'ALL',
          typeApres: 'LOC',
          nuAttach: '',
          nameAttach: 'teste_gw.txt',
          resourceID: 'br.com.sankhya.core.cad.parceiros',
          fileSelect: 1,
          oldFile: '',
        },
      },
    });
    console.log('   salvar OK:', JSON.stringify(r?.responseBody?.chave || r?.responseBody));
    const nu = parseInt(r?.responseBody?.chave?.valor, 10);
    if (nu) {
      await gateway.serviceCall('DatasetSP.removeRecord', {
        serviceName: 'DatasetSP.removeRecord',
        requestBody: { dataSetID: '001', entityName: 'AnexoSistema', standAlone: false, pks: [{ NUATTACH: nu }], ignoreListenerMethods: '' },
      });
      console.log('   cleanup OK');
    }
  } catch (e: any) {
    console.log('   salvar FALHOU:', e.message);
  }
}

bootstrap().catch((e) => console.error('FALHA:', e));
