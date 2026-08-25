import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== TESTING AnexoSistemaSP.salvar PARAM VARIATIONS ===');

  const codParc = '31547'; // Use client 31547 or 6614

  const testParams = [
    {
      description: 'Documento Anexo Teste 1',
      nameAttach: 'contrato_social.pdf',
      fileSelect: 0,
    },
    {
      description: 'Documento Anexo Teste 2',
      nameAttach: 'comprovante_endereco.pdf',
      fileSelect: 1,
    },
  ];

  for (const p of testParams) {
    try {
      console.log(`\nTesting with fileSelect=${p.fileSelect}, nameAttach=${p.nameAttach}...`);
      const res = await gateway.serviceCall('AnexoSistemaSP.salvar', {
        serviceName: 'AnexoSistemaSP.salvar',
        requestBody: {
          params: {
            pkEntity: codParc,
            keySession: `ANEXO_SISTEMA_Parceiro_${codParc}`,
            nameEntity: 'Parceiro',
            description: p.description,
            keyAttach: '',
            typeAcess: 'ALL',
            typeApres: 'LOC',
            nuAttach: '',
            nameAttach: p.nameAttach,
            resourceID: 'br.com.sankhya.core.cad.parceiros',
            fileSelect: p.fileSelect,
            oldFile: '',
          },
          clientEventList: {
            clientEvent: [
              { $: 'parceiro.mostra.mensagem.criticaie' },
              { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
            ],
          },
        },
      }, 'mge');

      console.log('Response:', JSON.stringify(res, null, 2));
    } catch (err: any) {
      console.log('Error:', err?.message || err);
    }
  }
}

bootstrap();
