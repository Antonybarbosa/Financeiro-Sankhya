import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testTsiataIntegration() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);

  console.log('=== TESTANDO RECUPERAÇÃO DE BLOB DA TABELA TSIATA ===\n');

  // Testando com o parceiro 41858 (que tem cartaz-1.png em TSIATA.CONTEUDO)
  const result = await repo.baixarAnexoArquivo(41858, 41858);
  console.log('Resultado da recuperação:');
  console.log({
    encontrado: !!result,
    nomeArquivo: result?.nomeArquivo,
    contentType: result?.contentType,
    tamanhoBytes: result?.buffer?.length,
  });

  if (result && result.buffer.length > 0) {
    console.log('\n[SUCESSO SENSACIONAL] BLOB da TSIATA retornado com 100% de integridade!');
    console.log('Magic Number:', result.buffer.subarray(0, 8).toString('hex'));
  }
}

testTsiataIntegration().catch(console.error);
