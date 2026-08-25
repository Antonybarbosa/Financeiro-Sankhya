import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());
  const token = await gateway.getToken();
  const baseUrl = process.env.GATEWAY_URL || 'https://api.sandbox.sankhya.com.br';

  console.log('================================================================');
  console.log(`  PROBING ALL ATTACHMENT DOWNLOAD VARIANTS FOR CODPARC #${CODPARC}`);
  console.log('================================================================\n');

  // 1. Listar todos os anexos de TSIANX para o parceiro 6614
  const rows = await gateway.executeQuery(`
    SELECT NUATTACH, NOMEINSTANCIA, PKREGISTRO, NOMEARQUIVO, DESCRICAO, CHAVEARQUIVO
    FROM TSIANX
    WHERE NOMEINSTANCIA = 'Parceiro' AND PKREGISTRO LIKE '${CODPARC}%'
    ORDER BY NUATTACH DESC
  `);
  console.log(`Anexos encontrados em TSIANX (${rows.length}):`);
  console.table(rows);

  if (rows.length === 0) return;

  // Testar com o anexo 17 (ou 7)
  const anx = rows.find((r: any) => String(r.NUATTACH) === '17') || rows[0];
  console.log(`\nTesting download for NUATTACH #${anx.NUATTACH} (${anx.NOMEARQUIVO}):`);
  console.log(`Static CHAVEARQUIVO: ${anx.CHAVEARQUIVO}`);

  // Step A: Call AnexoSistemaSP.baixar
  let chaveTemp = '';
  try {
    const resBaixar = await gateway.serviceCall(
      'AnexoSistemaSP.baixar',
      {
        serviceName: 'AnexoSistemaSP.baixar',
        requestBody: {
          paramsDown: {
            nuAttach: String(anx.NUATTACH),
            pkEntity: String(CODPARC),
            nameEntity: 'Parceiro',
            nameAttach: anx.NOMEARQUIVO,
            keyAttach: anx.CHAVEARQUIVO,
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
    console.log('\nAnexoSistemaSP.baixar response:', JSON.stringify(resBaixar, null, 2));
    chaveTemp = resBaixar?.responseBody?.chave?.valor || '';
  } catch (err: any) {
    console.error('AnexoSistemaSP.baixar error:', err?.message || err);
  }

  console.log('\nChave Temporária de AnexoSistemaSP.baixar:', chaveTemp || '(NULA)');

  // Step B: Probe download URLs with both static key and temp key
  const keysToTest = [
    { label: 'Chave Temporária (ARQUIVOANEXO...)', key: chaveTemp },
    { label: 'Chave Estática (TSIANX.CHAVEARQUIVO)', key: anx.CHAVEARQUIVO },
  ].filter(k => !!k.key);

  const modules = ['mge', 'mgebase', 'mgecom', 'mgefin'];
  const endpoints = ['visualizadorArquivos.mge', 'visualizador.mge', 'downloadFile.mge', 'servico.sbr'];

  for (const k of keysToTest) {
    console.log(`\n--- PROBING WITH ${k.label}: ${k.key} ---`);

    for (const mod of modules) {
      for (const ep of endpoints) {
        const queryVariants = [
          `download=S&chaveArquivo=${encodeURIComponent(k.key)}`,
          `chaveArquivo=${encodeURIComponent(k.key)}`,
          `chave=${encodeURIComponent(k.key)}`,
          `download=S&chave=${encodeURIComponent(k.key)}`,
          `nuAttach=${anx.NUATTACH}&pkEntity=${CODPARC}&nameEntity=Parceiro&chaveArquivo=${encodeURIComponent(k.key)}`,
        ];

        for (const q of queryVariants) {
          const url = `${baseUrl}/gateway/v1/${mod}/${ep}?${q}`;
          try {
            const res = await fetch(url, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const buf = Buffer.from(await res.arrayBuffer());
            const ct = res.headers.get('content-type') || '';
            const cd = res.headers.get('content-disposition') || '';
            const isHtml = ct.includes('html') || buf.subarray(0, 6).toString('ascii').startsWith('<html') || buf.subarray(0, 6).toString('ascii').startsWith('<!DOC');

            if (res.status === 200 && !isHtml) {
              console.log(`\n🎉 SUCESSO! URL: ${url}`);
              console.log(`   Status: ${res.status} | Content-Type: ${ct} | Content-Disposition: ${cd} | Bytes: ${buf.length}`);
              console.log(`   Preview (hex): ${buf.subarray(0, 16).toString('hex')}`);
              if (ct.includes('text') || buf.length < 500) {
                console.log(`   Text preview: ${buf.toString('utf-8').slice(0, 100)}`);
              }
            } else {
              // Exibe apenas de endpoints que responderam diferente do 404 padrão
              if (res.status !== 404) {
                console.log(`[${mod}/${ep}?${q.slice(0, 40)}] ${res.status} ct=${ct} html=${isHtml} len=${buf.length}`);
              }
            }
          } catch (e: any) {
            // ignore
          }
        }
      }
    }
  }
}

bootstrap().catch(console.error);
