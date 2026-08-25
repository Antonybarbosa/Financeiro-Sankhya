import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

async function testDownload6614() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);

  console.log('=== TESTANDO DOWNLOAD DE ANEXOS EXISTENTES PARA CLIENTE #6614 ===\n');

  // Listar anexos do parceiro 6614 em TSIANX
  const anexos = await repo.buscarAnexosParceiro(CODPARC);
  console.log(`Anexos encontrados para parceiro #${CODPARC} (${anexos.length}):`);
  console.table(anexos);

  for (const anx of anexos) {
    console.log(`\nTestando baixarAnexoArquivo(${CODPARC}, ${anx.nuAttach}) [${anx.nomeArquivo}]...`);
    const res = await repo.baixarAnexoArquivo(CODPARC, anx.nuAttach);
    if (res) {
      console.log(`   ✅ SUCESSO! Nome: ${res.nomeArquivo} | Type: ${res.contentType} | Bytes: ${res.buffer.length}`);
    } else {
      console.log(`   ❌ RETORNOU NULL (Arquivo físico não encontrado nem localmente, nem em TSIATA, nem no Gateway)`);
    }
  }
}

testDownload6614().catch(console.error);
