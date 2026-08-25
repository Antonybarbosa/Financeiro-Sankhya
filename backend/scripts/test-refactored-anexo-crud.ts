import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testRefactoredAnexoCrud() {
  console.log('=== TESTANDO REPOSITÓRIO DE ANEXOS REFATORADO ===\n');

  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);

  // 1. Listar anexos para parceiro 6614
  console.log('1. Lista de anexos para Parceiro #6614:');
  const anexos6614 = await repo.buscarAnexosParceiro(6614);
  console.table(anexos6614);

  // 2. Tentar baixar o anexo TSIATA do parceiro 6614 (sequencia 0)
  const anexoTsiata = anexos6614.find(a => a.fonte === 'TSIATA');
  if (anexoTsiata) {
    console.log(`\n2. Baixando anexo TSIATA seq=${anexoTsiata.nuAttach} (${anexoTsiata.nomeArquivo})...`);
    const downloaded = await repo.baixarAnexoArquivo(6614, anexoTsiata.nuAttach, 'TSIATA', anexoTsiata.nomeArquivo);
    if (downloaded) {
      console.log(`  ✅ Download OK! Tamanho: ${downloaded.buffer.length} bytes, ContentType: ${downloaded.contentType}`);
      console.log(`  Conteúdo: ${downloaded.buffer.toString('utf-8').trim()}`);
    } else {
      console.log('  ❌ Falha no download.');
    }
  }

  // 3. Listar anexos para parceiro 41858
  console.log('\n3. Lista de anexos para Parceiro #41858:');
  const anexos41858 = await repo.buscarAnexosParceiro(41858);
  console.table(anexos41858);

  if (anexos41858.length > 0) {
    const a = anexos41858[0];
    console.log(`\n4. Baixando anexo TSIATA de #41858 seq=${a.nuAttach} (${a.nomeArquivo})...`);
    const downloaded = await repo.baixarAnexoArquivo(41858, a.nuAttach, a.fonte, a.nomeArquivo);
    if (downloaded) {
      console.log(`  ✅ Download OK! Tamanho: ${downloaded.buffer.length} bytes, ContentType: ${downloaded.contentType}`);
      console.log(`  Magic bytes: ${downloaded.buffer.subarray(0, 8).toString('hex').toUpperCase()}`);
    } else {
      console.log('  ❌ Falha no download.');
    }
  }

  console.log('\n=== TESTES CONCLUÍDOS ===');
}

testRefactoredAnexoCrud().catch(console.error);
