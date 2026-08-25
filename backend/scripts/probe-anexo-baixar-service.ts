import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== TESTING AnexoSistemaSP.baixar SERVICE ===\n');

  // 1. Busca um anexo de TSIANX para o parceiro 6614
  const rows = await gateway.executeQuery(`
    SELECT NUATTACH, NOMEINSTANCIA, PKREGISTRO, NOMEARQUIVO, DESCRICAO, CHAVEARQUIVO
    FROM TSIANX
    WHERE NOMEINSTANCIA = 'Parceiro' AND PKREGISTRO LIKE '${CODPARC}%'
    ORDER BY NUATTACH DESC
  `);
  console.log(`Encontrados ${rows.length} anexos em TSIANX:`);
  console.log(JSON.stringify(rows, null, 2));

  if (rows.length === 0) return;

  const anx = rows[0];
  const nuAttach = String(anx.NUATTACH);
  const nameAttach = anx.NOMEARQUIVO || '';
  const keyAttach = anx.CHAVEARQUIVO || '';

  console.log(`\nChamando AnexoSistemaSP.baixar para NUATTACH=${nuAttach}, nameAttach=${nameAttach}, keyAttach=${keyAttach}...`);

  try {
    const res = await gateway.serviceCall(
      'AnexoSistemaSP.baixar',
      {
        serviceName: 'AnexoSistemaSP.baixar',
        requestBody: {
          paramsDown: {
            nuAttach,
            pkEntity: String(CODPARC),
            nameEntity: 'Parceiro',
            nameAttach,
            keyAttach,
          },
          clientEventList: {
            clientEvent: [
              { $: 'parceiro.mostra.mensagem.criticaie' },
              { $: 'br.com.sankhya.mgecore.ie.repetida.transportadora' },
            ],
          },
        },
      },
      'mge',
    );

    console.log('\nResposta de AnexoSistemaSP.baixar:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.error('Erro ao chamar AnexoSistemaSP.baixar:', err?.message || err);
  }
}

bootstrap().catch(console.error);
