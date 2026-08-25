import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/presentation/app.module';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Teste E2E HTTP do fluxo real do browser:
 * 1. CEP pesquisado (ViaCEP) -> form preenche campos
 * 2. PUT /api/clientes/:id com endereco + enderecoEntrega preenchidos
 * 3. Verifica se o pipeline HTTP (ValidationPipe -> Controller -> UseCases -> Repo -> Sankhya)
 *    aplicou NUMEND/COMPLEMENTO/CEP/CODCID/CODBAI/CODEND no Oracle
 */

const CODPARC = 41859;

async function main() {
  const secret = process.env.JWT_SECRET || 'financeiro_sankhya_jwt_dev_min_32_chars_trocar_em_prod';
  const token = jwt.sign({ codusu: 1, username: 'teste.e2e' }, secret, { expiresIn: '5m' });

  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();

  // Fetch disponível no Node 18+; usa http do proprio app
  const server = app.getHttpServer();
  const port = 3999;
  await new Promise<void>(resolve => server.listen(port, resolve));
  const base = `http://127.0.0.1:${port}`;

  const gateway = app.get(SankhyaGateway);
  const fetchState = async () => {
    const row = (await gateway.executeQuery(`
      SELECT NUMEND, COMPLEMENTO, CEP, CODCID, CODBAI, CODEND, DTALTER
      FROM TGFPAR WHERE CODPARC = ${CODPARC}`))[0];
    const ctt = (await gateway.executeQuery(`
      SELECT NUMEND, COMPLEMENTO, CEP, CODCID, CODBAI, CODEND, DHALTER
      FROM TGFCTT WHERE CODPARC = ${CODPARC} ORDER BY CODCONTATO`))[0] || {};
    return { par: row, ctt };
  };

  console.log('=== E2E HTTP: PUT com endereco preenchido pela busca de CEP ===\n');
  const antes = await fetchState();
  console.log('[ANTES]', JSON.stringify(antes));

  // Resolucao como o FRONTEND NOVO faz: cidade por match exato; bairro/logradouro
  // por match exato — se nao existir, envia apenas o NOME (sem FK errada)
  const repoAny = app.get('IClienteRepository') as any;
  const cid = (await repoAny.buscarCidades('RECIFE')).find((c: any) => c.nomeCidade === 'RECIFE');
  console.log(`Combobox: cidade exata=${cid?.codCid}/${cid?.nomeCidade}; bairro 'SANTO ANTONIO' e logradouro 'RUA DO HOSPICIO' NAO existem exato no Sankhya -> payload envia so nomes\n`);

  const payload = {
    nomeParc: 'TESTE VALIDACAO UPDATE ALTERADO',
    endereco: {
      codCid: cid?.codCid,
      cidade: 'RECIFE',
      uf: 'PE',
      bairro: 'SANTO ANTONIO',          // nao-exato no Sankhya (existe CHAC. SANTO ANTONIO)
      logradouro: 'RUA DO HOSPICIO',    // inexistente no Sankhya
      numero: '456',
      complemento: 'E2E HTTP CEP v2',
      cep: '50050-900',
    },
    enderecoEntrega: {
      codCid: cid?.codCid,
      cidade: 'RECIFE',
      uf: 'PE',
      bairro: 'SANTO ANTONIO',
      logradouro: 'RUA DO HOSPICIO',
      numero: '654',
      complemento: 'E2E HTTP ENTREGA v2',
      cep: '50050-900',
      nomeContato: 'CONTATO E2E',
    },
  };

  const res = await fetch(`${base}/api/clientes/${CODPARC}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  console.log(`HTTP ${res.status}`);
  if (res.status !== 200) {
    console.log('ERRO:', JSON.stringify(body).slice(0, 400));
  } else {
    console.log('endereco retornado:', JSON.stringify(body.endereco));
    console.log('enderecoEntrega retornado:', JSON.stringify(body.enderecoEntrega));
  }

  const depois = await fetchState();
  console.log('\n[DEPOIS TGFPAR]', JSON.stringify(depois.par));
  console.log('[DEPOIS TGFCTT]', JSON.stringify(depois.ctt));

  const p = depois.par;
  // FKs de bairro/logradouro nao-exatas DEVEM ser preservadas nos valores de [ANTES]
  const checks: Array<[string, boolean]> = [
    ['TGFPAR.NUMEND aplicado', p.NUMEND === '456'],
    ['TGFPAR.COMPLEMENTO aplicado', p.COMPLEMENTO === 'E2E HTTP CEP v2'],
    ['TGFPAR.CEP aplicado', String(p.CEP).replace(/\D/g, '') === '50050900'],
    ['TGFPAR.CODCID resolvido (RECIFE exata)', String(p.CODCID) === String(cid?.codCid)],
    ['TGFPAR.CODBAI resolvido exato (SANTO ANTONIO=26, nao CHAC.=14989)', String(p.CODBAI) === '26'],
    ['TGFPAR.CODEND preservado', String(p.CODEND) === String(antes.par.CODEND)],
    ['TGFCTT.NUMEND aplicado', depois.ctt.NUMEND === '654'],
    ['TGFCTT.COMPLEMENTO aplicado', depois.ctt.COMPLEMENTO === 'E2E HTTP ENTREGA v2'],
    ['TGFCTT.CEP aplicado', String(depois.ctt.CEP ?? '').replace(/\D/g, '') === '50050900'],
    ['TGFCTT.CODCID resolvido (RECIFE exata)', String(depois.ctt.CODCID) === String(cid?.codCid)],
    ['TGFCTT.CODBAI resolvido exato (26)', String(depois.ctt.CODBAI) === '26'],
    ['TGFCTT.CODEND preservado (nao zerado)', String(depois.ctt.CODEND ?? antes.par.CODEND) === String(antes.ctt.CODEND ?? antes.par.CODEND)],
  ];
  let fail = 0;
  for (const [nome, ok] of checks) {
    console.log(`${ok ? 'PASS' : 'FAIL'} ${nome}`);
    if (!ok) fail++;
  }
  console.log(fail === 0 ? '\n>>> E2E HTTP OK: endereco do CEP aplicado <<<' : `\n>>> ${fail} FALHAS <<<`);

  server.close();
  await app.close();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
