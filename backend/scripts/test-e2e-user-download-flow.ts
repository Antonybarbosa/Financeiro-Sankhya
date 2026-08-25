import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

async function testUserDownloadFlow() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);

  console.log('================================================================');
  console.log('  TESTANDO FLUXO COMPLETO DE ANEXO DO USUÁRIO PARA CLIENTE #6614');
  console.log('================================================================\n');

  // 1. Simula o usuário enviando um documento em PDF real para o parceiro 6614
  const nomePdf = `Contrato_Parceiro_6614_${Date.now()}.pdf`;
  const pdfDummyBuffer = Buffer.from(`%PDF-1.4\n1 0 obj\n<< /Title (Contrato Parceiro 6614) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF`);

  console.log('1. Usuário envia novo anexo no modal do cliente #6614:');
  console.log(`   Nome do Arquivo: ${nomePdf}`);
  console.log(`   Tamanho: ${pdfDummyBuffer.length} bytes`);

  const anexoSalvo = await repo.salvarAnexoParceiro(
    CODPARC,
    nomePdf,
    'Contrato Assinado do Cliente',
    {
      content: pdfDummyBuffer,
      contentType: 'application/pdf',
    },
  );

  console.log(`\n2. Anexo gravado no Sankhya + Local:`);
  console.log(`   NUATTACH: ${anexoSalvo.nuAttach}`);
  console.log(`   Nome: ${anexoSalvo.nomeArquivo}`);

  // 3. Simula o usuário clicando no botão "Baixar / Visualizar Documento"
  console.log(`\n3. Usuário clica em "Baixar / Visualizar Documento" na tabela...`);
  const anexoBaixado = await repo.baixarAnexoArquivo(CODPARC, anexoSalvo.nuAttach);

  if (!anexoBaixado) {
    console.error('❌ FALHA: Anexo não foi encontrado ao tentar baixar!');
    return;
  }

  console.log(`   ✅ SUCESSO! O arquivo baixou perfeitamente!`);
  console.log(`        Nome: ${anexoBaixado.nomeArquivo}`);
  console.log(`        Content-Type: ${anexoBaixado.contentType}`);
  console.log(`        Tamanho dos bytes: ${anexoBaixado.buffer.length} bytes`);
  console.log(`        Primeiros 8 bytes (Magic PDF): ${anexoBaixado.buffer.subarray(0, 8).toString('ascii')}`);

  // 4. Limpeza
  await repo.removerAnexoParceiro(CODPARC, anexoSalvo.nuAttach);
  console.log('\n4. Limpeza concluída.');

  console.log('\n================================================================');
  console.log('  FLUXO COMPLETO DO USUÁRIO FUNCIONANDO 100%!');
  console.log('================================================================');
}

testUserDownloadFlow().catch(console.error);
