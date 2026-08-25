import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runTest() {
  console.log('=== Testando Validação Nativa de CNPJ/CPF (ParceiroSP.verificaExistenciaCpfInscEstRepetido) ===\n');

  const configService = new ConfigService();
  const gateway = new SankhyaGateway(configService);
  const repository = new SankhyaClienteRepository(gateway);

  // CNPJ Existente no Sankhya (ex: 14.450.125/0001-28)
  const cnpjExistente = '14450125000128';
  console.log(`1. Testando CNPJ existente (${cnpjExistente})...`);
  const resExistente = await repository.validarDocumentoExistente(cnpjExistente);
  console.log('Resultado:', resExistente);

  // CNPJ Inexistente
  const cnpjNovo = '00000000000191';
  console.log(`\n2. Testando CNPJ novo (${cnpjNovo})...`);
  const resNovo = await repository.validarDocumentoExistente(cnpjNovo);
  console.log('Resultado:', resNovo);
}

runTest().catch(console.error);
