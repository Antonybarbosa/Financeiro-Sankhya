import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const CODPARC = 6614;

async function main() {
  const g = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(g);

  console.log('Initializing session via executeQuery...');
  await g.executeQuery('SELECT 1 FROM DUAL');

  console.log('Testing salvarAnexoParceiro...');
  const res = await repo.salvarAnexoParceiro(
    CODPARC,
    'teste_roundtrip_api.txt',
    'Teste Cookie vs NoCookie',
    { content: Buffer.from('Hello test content\n'), contentType: 'text/plain' }
  );
  console.log('Criado:', res);

  // cleanup
  await repo.removerAnexoParceiro(CODPARC, res.nuAttach);
  console.log('Removido nuAttach:', res.nuAttach);
}

main().catch(console.error);
