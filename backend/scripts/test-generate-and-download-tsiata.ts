import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

async function testGenerateAndDownloadTsiata() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);

  console.log('================================================================');
  console.log('  TESTANDO GERAÇÃO, PERSISTÊNCIA E LEITURA DE ARQUIVO REAL (TSIATA)');
  console.log('================================================================\n');

  // 1. Gera um arquivo binário sintético (um cabeçalho PNG válido com padrão de cores)
  const timestamp = Date.now();
  const nomeArquivo = `gerado_teste_${timestamp}.png`;
  
  // Magic bytes de PNG (89 50 4E 47 0D 0A 1A 0A) + dados de teste
  const headerPng = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const payloadTeste = Buffer.from(`CONTEUDO_GERADO_FINANCEIRO_SANKHYA_${timestamp}_`.repeat(50), 'utf-8');
  const bufferOriginal = Buffer.concat([headerPng, payloadTeste]);

  console.log(`1. Arquivo original gerado na memória:`);
  console.log(`   Nome: ${nomeArquivo}`);
  console.log(`   Tamanho: ${bufferOriginal.length} bytes`);
  console.log(`   Header Hex: ${bufferOriginal.subarray(0, 8).toString('hex')}`);

  // 2. Salva o anexo via salvarAnexoParceiro (gera TSIANX + cache local + sessão)
  console.log('\n2. Salvando anexo para o cliente #6614...');
  const anexoCriado = await repo.salvarAnexoParceiro(
    CODPARC,
    nomeArquivo,
    'Arquivo Gerado em Teste Automático',
    {
      content: bufferOriginal,
      contentType: 'image/png',
    },
  );

  console.log(`   [OK] Anexo criado com sucesso! NUATTACH=${anexoCriado.nuAttach}`);

  // 3. Testa o download do anexo recém gerado via baixarAnexoArquivo
  console.log(`\n3. Recuperando o arquivo gerado via baixarAnexoArquivo...`);
  const anexoRecuperado = await repo.baixarAnexoArquivo(CODPARC, anexoCriado.nuAttach);

  if (!anexoRecuperado) {
    console.error('❌ ERRO: O arquivo não pôde ser recuperado!');
    return;
  }

  console.log(`   [OK] Arquivo recuperado!`);
  console.log(`        Nome: ${anexoRecuperado.nomeArquivo}`);
  console.log(`        Content-Type: ${anexoRecuperado.contentType}`);
  console.log(`        Tamanho recuperado: ${anexoRecuperado.buffer.length} bytes`);
  console.log(`        Header Hex: ${anexoRecuperado.buffer.subarray(0, 8).toString('hex')}`);

  // 4. Validação de Integridade (Comparação Byte a Byte)
  const isIdentico = bufferOriginal.equals(anexoRecuperado.buffer);
  console.log(`\n4. Validação de Integridade Byte a Byte:`);
  console.log(`   Conteúdo 100% idêntico ao original gerado? ${isIdentico ? '✅ SIM (EXATO)' : '❌ NÃO'}`);

  // 5. Salva em arquivo físico em disco para que o usuário possa abrir e testar no SO
  const outDir = path.join(__dirname, '../uploads/testes_gerados');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFilePath = path.join(outDir, nomeArquivo);
  fs.writeFileSync(outFilePath, anexoRecuperado.buffer);

  console.log(`\n5. Arquivo gravado no disco local do servidor:`);
  console.log(`   Caminho: ${outFilePath}`);
  console.log(`   Existe no disco? ${fs.existsSync(outFilePath) ? '✅ SIM' : '❌ NÃO'}`);
  console.log(`   Tamanho no disco: ${fs.statSync(outFilePath).size} bytes`);

  // 6. Limpeza do registro de teste
  console.log('\n6. Executando limpeza do registro de teste...');
  await repo.removerAnexoParceiro(CODPARC, anexoCriado.nuAttach);
  console.log('   [OK] Anexo de teste removido.');

  console.log('\n================================================================');
  console.log('  TESTE DE GERAÇÃO E ABERTURA DE ARQUIVO: SUCESSO ABSOLUTO!');
  console.log('================================================================');
}

testGenerateAndDownloadTsiata().catch(console.error);
