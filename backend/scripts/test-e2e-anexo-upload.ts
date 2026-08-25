import { ConfigService } from '@nestjs/config';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);

  console.log('=== E2E ANEXO: upload real (bytes) -> listar -> baixar ===\n');

  // 1. upload com bytes reais (PDF mínimo válido)
  const pdfBytes = Buffer.from(
    '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\n%%EOF\n',
    'utf-8',
  );

  console.log('1) uploadAnexo...');
  const criado = await repo.salvarAnexoParceiro(CODPARC, 'teste_e2e_api.pdf', 'Teste E2E Upload Real', {
    content: pdfBytes,
    contentType: 'application/pdf',
  });
  console.log('   criado:', JSON.stringify(criado));

  // 2. listar
  console.log('\n2) buscarAnexos...');
  const anexos = await repo.buscarAnexosParceiro(CODPARC);
  console.log(`   ${anexos.length} anexo(s):`);
  anexos.forEach((a: any) => console.log(`   - #${a.nuAttach} ${a.nomeArquivo} chave=${a.chaveArquivo || 'SEM CHAVE'}`));

  // 3. baixar o recém-criado
  console.log('\n3) baixarAnexoArquivo...');
  const baixado = await repo.baixarAnexoArquivo(CODPARC, criado.nuAttach);
  if (baixado) {
    const ok = baixado.buffer.equals(pdfBytes);
    console.log(`   OK bytes=${baixado.buffer.length} tipo=${baixado.contentType} CONTEUDO_IDENTICO=${ok}`);
  } else {
    console.log('   NULL — ambiente não serve arquivo físico via gateway (esperado no sandbox). Anexo registrado; visualizar via tela nativa.');
  }

  // 4. cleanup
  console.log('\n4) cleanup...');
  await repo.removerAnexoParceiro(CODPARC, criado.nuAttach);
  const finais = await repo.buscarAnexosParceiro(CODPARC);
  console.log(`   restam ${finais.length}:`, finais.map((a: any) => `#${a.nuAttach} ${a.nomeArquivo}`).join(', '));
}

bootstrap().catch((e) => console.error('FALHA E2E:', e));
