import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

// Reproduz o bug reportado: payload com campos null (ex-descBonif:null via API)
// NAO deve gerar String(null)="null" -> "largura acima do limite (4 > 1)".
async function main() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);
  const codParc = 41859;

  console.log('Probe: update com descBonif/prazoPag/limiteCredito = null (deve ignorar nulos)...');
  await repo.update(codParc, {
    descBonif: null,
    prazoPag: null,
    limiteCredito: null,
    emailNotifEntrega: null,
    observacoes: null,
    nomeParc: 'TESTE VALIDACAO UPDATE ALTERADO',
  } as any);

  const row = (await gateway.executeQuery(
    `SELECT DESCBONIF, PRAZOPAG, LIMCRED, EMAILNOTIFENTREGA FROM TGFPAR WHERE CODPARC = ${codParc}`,
  ))[0];
  console.log('Estado pos-update:', row);
  console.log(row.DESCBONIF === 'L' ? 'PASS: DESCBONIF intacto (null ignorado)' : `CHECK: DESCBONIF=${row.DESCBONIF}`);
  process.exit(0);
}

main().catch(err => { console.error('FALHOU:', err?.message || err); process.exit(1); });
