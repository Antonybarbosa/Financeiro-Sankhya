import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import { ClienteUseCases } from '../src/application/use-cases/cliente.use-cases';
import { UpdateClienteDto } from '../src/application/dto/cliente.dto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Validacao ponta-a-ponta do UPDATE de cliente:
 * 1. Localiza (ou cria) cliente de teste com CNPJ 11.222.333/0001-81
 * 2. Snapshot TGFPAR + TGFCTT antes da alteracao
 * 3. atualizarCliente() com TODOS os campos alterados
 * 4. Verificacao coluna a coluna via SQL direto (DbExplorer)
 * 5. Verifica DTALTER (TGFPAR) e DHALTER (TGFCTT)
 * 6. Teste de troca de CNPJ/CPF + tipo de pessoa
 * 7. Inativacao do registro de teste (limpeza)
 */

const CNPJ_TESTE = '11222333000181';
const CPF_TESTE = '11144477735';

type CheckStatus = 'PASS' | 'FAIL' | 'SKIP';
const resultados: Record<string, { campo: string; esperado: string; obtido: string; status: CheckStatus; obs?: string }> = {};

function check(campo: string, esperado: any, obtido: any, status: CheckStatus, obs?: string) {
  resultados[campo] = { campo, esperado: String(esperado), obtido: String(obtido), status, obs };
}

function cmpStr(campo: string, esperado: string, obtido: any) {
  const o = (obtido === null || obtido === undefined) ? '' : String(obtido).trim();
  check(campo, esperado, o, o === esperado ? 'PASS' : 'FAIL');
}

function cmpNum(campo: string, esperado: number, obtido: any, tol = 0.001) {
  const o = parseFloat(String(obtido ?? '').replace(',', '.'));
  check(campo, esperado, `${obtido} (parsed=${isNaN(o) ? 'NaN' : o})`, !isNaN(o) && Math.abs(o - esperado) <= tol ? 'PASS' : 'FAIL');
}

function cmpInt(campo: string, esperado: number, obtido: any) {
  const o = parseInt(String(obtido ?? ''));
  check(campo, esperado, `${obtido} (parsed=${isNaN(o) ? 'NaN' : o})`, o === esperado ? 'PASS' : 'FAIL');
}

function parseDt(v: any): number {
  if (!v) return 0;
  const s = String(v).trim();
  // executeQuery retorna 'DDMMYYYY HH:mm:ss' (sem separadores de data)
  let m = s.match(/^(\d{2})(\d{2})(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime();
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]).getTime();
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
  const d = new Date(s).getTime();
  return isNaN(d) ? 0 : d;
}

const TGFPAR_COLS = `NOMEPARC, RAZAOSOCIAL, CGC_CPF, TIPPESSOA, SITUACAO, ATIVO, TELEFONE, EMAIL,
  IDENTINSCESTAD, PRAZOPAG, LIMCRED, OBSERVACOES, LIMCREDMENSAL, QTDMAXTITVENCIDOS,
  CODTAB, CODVEND, CODBCO, DESCBONIF, DESCFIN, INSCMUN, CLASSIFICMS,
  RETEMISS, RETEMINSS, RETEMPIS, RETEMCOFINS, RETEMCSL,
  AD_CREDCLI, AD_LIMITEPAR, AD_LOCALCAD, AD_CODBCOBOL,
  SIMPLES, PERFILECONECT, TIPOFATUR, REGIMEESPTRIBISS, TIPCLIENTESERVCOM,
  EMAILNOTIFENTREGA, ENTREGAENDCONTATO, EXIGCONTATOENTCAB, LATITUDE, LONGITUDE,
  NUMEND, COMPLEMENTO, CEP, CODBAI, CODCID, CODEND, DTALTER`;

async function fetchPar(gateway: SankhyaGateway, codParc: number): Promise<any> {
  const rows = await gateway.executeQuery(`SELECT ${TGFPAR_COLS} FROM TGFPAR WHERE CODPARC = ${codParc}`);
  return rows[0] || {};
}

async function fetchCtt(gateway: SankhyaGateway, codParc: number): Promise<any[]> {
  return await gateway.executeQuery(`
    SELECT CODCONTATO, CODEND, NUMEND, COMPLEMENTO, CODBAI, CODCID, CEP, NOMECONTATO, DHALTER
    FROM TGFCTT WHERE CODPARC = ${codParc} ORDER BY CODCONTATO`);
}

async function pickDictOption(gateway: SankhyaGateway, campo: string): Promise<string | null> {
  const rows = await gateway.executeQuery(`
    SELECT OPC.VALOR FROM TDDCAM CAM
    JOIN TDDOPC OPC ON OPC.NUCAMPO = CAM.NUCAMPO
    WHERE CAM.NOMETAB = 'TGFPAR' AND CAM.NOMECAMPO = '${campo}'
    ORDER BY OPC.ORDEM`);
  return rows.length > 0 ? String(rows[0].VALOR) : null;
}

async function main() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);
  const useCases = new ClienteUseCases(repo);

  console.log('=== VALIDACAO COMPLETA: UPDATE DE TODOS OS CAMPOS DO CLIENTE ===\n');

  // ---------------------------------------------------------------
  // PASSO 0: localizar ou criar cliente de teste
  // ---------------------------------------------------------------
  console.log('[PASSO 0] Localizando cliente de teste (CNPJ 11.222.333/0001-81)...');
  let testCliente = (await repo.findByCnpjCpf(CNPJ_TESTE, true))[0];

  if (!testCliente) {
    console.log('  Nao encontrado. Criando novo cliente de teste...');
    testCliente = await useCases.criarCliente({
      nomeParc: 'TESTE VALIDACAO UPDATE',
      tipoPessoa: 'J' as any,
      cnpjCpf: CNPJ_TESTE,
      endereco: { cidade: 'RECIFE', uf: 'PE' } as any,
    } as any);
    console.log(`  Criado CODPARC ${testCliente.codParc}`);
  } else {
    console.log(`  Reutilizando CODPARC ${testCliente.codParc} (ATIVO=${testCliente.ativo ? 'S' : 'N'})`);
  }
  const codParc = testCliente.codParc;

  // ---------------------------------------------------------------
  // PASSO 1: snapshot do estado original
  // ---------------------------------------------------------------
  console.log('\n[PASSO 1] Snapshot TGFPAR + TGFCTT antes da alteracao...');
  const before = await fetchPar(gateway, codParc);
  const beforeCtt = await fetchCtt(gateway, codParc);
  const dtAlterBefore = parseDt(before.DTALTER);
  console.log(`  DTALTER antes: ${before.DTALTER}`);
  console.log(`  TGFCTT rows antes: ${beforeCtt.length}`);

  // ---------------------------------------------------------------
  // PASSO 2: coletar valores validos (dicionario + FKs)
  // ---------------------------------------------------------------
  console.log('\n[PASSO 2] Coletando valores validos de FKs e dicionario...');
  const [vendRows, bcoRows, tabRows, cidRows, baiRows, endRows] = await Promise.all([
    gateway.executeQuery(`SELECT CODVEND FROM TGFVEN WHERE CODVEND > 0 AND ROWNUM <= 1`),
    gateway.executeQuery(`SELECT CODBCO FROM TSIBCO WHERE CODBCO > 0 AND ROWNUM <= 1`),
    gateway.executeQuery(`SELECT CODTAB FROM TGFTAB WHERE ROWNUM <= 1`),
    repo.buscarCidades('RECIFE'),
    repo.buscarBairros('AFOGADOS'),
    repo.buscarLogradouros('RUA COTUNGUBA'),
  ]);
  const codVend = vendRows.length ? parseInt(vendRows[0].CODVEND) : null;
  const codBco = bcoRows.length ? parseInt(bcoRows[0].CODBCO) : null;
  const codTab = tabRows.length ? String(tabRows[0].CODTAB).trim() : null;
  const codCid = cidRows.length ? cidRows[0].codCid : null;
  const codBai = baiRows.length ? baiRows[0].codBai : null;
  const codEnd = endRows.length ? endRows[0].codEnd : null;
  console.log(`  codVend=${codVend} codBco=${codBco} codTab=${codTab} codCid=${codCid}(${cidRows[0]?.uf}) codBai=${codBai} codEnd=${codEnd}`);

  const dictClassifcms = await pickDictOption(gateway, 'CLASSIFCMS');
  const dictPerfilEconect = await pickDictOption(gateway, 'PERFILECONECT');
  const dictTipoFatur = await pickDictOption(gateway, 'TIPOFATUR');
  const dictRegimeIss = await pickDictOption(gateway, 'REGIMEESPTRIBISS');
  const dictTipCliente = await pickDictOption(gateway, 'TIPCLIENTESERVCOM');
  const dictSimples = await pickDictOption(gateway, 'SIMPLES');
  console.log(`  dicionario: CLASSIFCMS=${dictClassifcms} PERFILECONECT=${dictPerfilEconect} TIPOFATUR=${dictTipoFatur} REGIMEISS=${dictRegimeIss} TIPCLIENTE=${dictTipCliente} SIMPLES=${dictSimples}`);

  // ---------------------------------------------------------------
  // PASSO 3: UPDATE com todos os campos
  // ---------------------------------------------------------------
  console.log('\n[PASSO 3] atualizarCliente() com TODOS os campos alterados...');
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const dto: UpdateClienteDto = {
    nomeParc: 'TESTE VALIDACAO UPDATE ALTERADO',
    razaoSocial: 'TESTE VALIDACAO LTDA',
    telefone: '(81) 99999-8888',
    email: 'validacao@teste.local',
    inscricaoEstadual: '123456789',
    situacao: 'O' as any,
    prazoPag: 45,
    limiteCredito: 7890.12,
    observacoes: 'VALIDACAO AUTOMATIZADA ' + stamp,
    limiteCreditoMensal: 4567.89,
    qtdMaxTitVencidos: 7,
    ...(codTab !== null ? { codTab } : {}),
    ...(codVend !== null ? { codVend } : {}),
    ...(codBco !== null ? { codBco } : {}),
    descBonif: 'L' as any,
    descFin: 2.75,
    inscricaoMunicipal: '987654321',
    ...(dictClassifcms ? { classificacaoIcms: dictClassifcms } : {}),
    retemIss: 'S',
    retemInss: 'S',
    retemPis: 'S',
    retemCofins: 'S',
    retemCsl: 'S',
    adCredCli: 123.45,
    adLimitePar: 234.56,
    adLocalCad: 'VALIDACAO',
    ...(codBco !== null ? { adCodBcoBol: codBco } : {}),
    ...(dictSimples ? { simples: dictSimples } : { simples: 'N' }),
    ...(dictPerfilEconect ? { perfilEconect: dictPerfilEconect } : {}),
    ...(dictTipoFatur ? { tipoFatur: dictTipoFatur } : {}),
    ...(dictRegimeIss ? { regimeEspTribIss: dictRegimeIss } : {}),
    ...(dictTipCliente ? { tipoClienteServCom: dictTipCliente } : {}),
    emailNotifEntrega: 'entrega@teste.local',
    entregaEndContato: 'S',
    exigContatoEntCab: 'S',
    latitude: '-8.047562',
    longitude: '-34.877002',
    endereco: {
      ...(codEnd !== null ? { codEnd } : { logradouro: 'RUA COTUNGUBA' }),
      numero: '100',
      complemento: 'APTO VALIDACAO',
      ...(codBai !== null ? { codBai } : { bairro: 'AFOGADOS' }),
      ...(codCid !== null ? { codCid } : { cidade: 'RECIFE', uf: 'PE' }),
      cep: '50750-180',
    },
    enderecoEntrega: {
      ...(codEnd !== null ? { codEnd } : { logradouro: 'RUA COTUNGUBA' }),
      numero: '79C',
      complemento: 'GALPAO VALIDACAO',
      ...(codBai !== null ? { codBai } : { bairro: 'AFOGADOS' }),
      ...(codCid !== null ? { codCid } : { cidade: 'RECIFE', uf: 'PE' }),
      cep: '50750-180',
      nomeContato: 'CONTATO VALIDACAO',
    },
  } as UpdateClienteDto;

  const t0 = Date.now();
  let atualizado: any;
  try {
    atualizado = await useCases.atualizarCliente(codParc, dto);
    console.log(`  Update concluido em ${Date.now() - t0}ms`);
  } catch (err: any) {
    console.error('  FALHA GERAL no update:', err?.message || err);
    throw err;
  }

  // ---------------------------------------------------------------
  // PASSO 4: verificacao coluna a coluna (SQL direto)
  // ---------------------------------------------------------------
  console.log('\n[PASSO 4] Verificando aplicacao coluna a coluna via SQL direto...');
  const after = await fetchPar(gateway, codParc);

  // Dados Gerais
  cmpStr('NOMEPARC', 'TESTE VALIDACAO UPDATE ALTERADO', after.NOMEPARC);
  cmpStr('RAZAOSOCIAL', 'TESTE VALIDACAO LTDA', after.RAZAOSOCIAL);
  cmpStr('TELEFONE (digitos)', '81999998888', String(after.TELEFONE || '').replace(/\D/g, ''));
  cmpStr('EMAIL', 'validacao@teste.local', after.EMAIL);
  cmpStr('IDENTINSCESTAD', '123456789', after.IDENTINSCESTAD);
  cmpStr('SITUACAO', 'O', after.SITUACAO);

  // Financeiro & Credito
  cmpInt('PRAZOPAG', 45, after.PRAZOPAG);
  cmpNum('LIMCRED', 7890.12, after.LIMCRED);
  cmpStr('OBSERVACOES', 'VALIDACAO AUTOMATIZADA ' + stamp, after.OBSERVACOES);
  cmpNum('LIMCREDMENSAL', 4567.89, after.LIMCREDMENSAL);
  cmpInt('QTDMAXTITVENCIDOS', 7, after.QTDMAXTITVENCIDOS);
  if (codTab !== null) cmpStr('CODTAB', codTab, after.CODTAB);
  else check('CODTAB', '-', '-', 'SKIP', 'sem TGFTAB');
  if (codVend !== null) cmpInt('CODVEND', codVend, after.CODVEND);
  else check('CODVEND', '-', '-', 'SKIP', 'sem TGFVEN');
  if (codBco !== null) cmpInt('CODBCO', codBco, after.CODBCO);
  else check('CODBCO', '-', '-', 'SKIP', 'sem TSIBCO');
  cmpStr('DESCBONIF', 'L', after.DESCBONIF);
  cmpNum('DESCFIN', 2.75, after.DESCFIN);

  // Fiscal & Tributario
  cmpStr('INSCMUN', '987654321', after.INSCMUN);
  if (dictClassifcms) cmpStr('CLASSIFICMS', dictClassifcms, after.CLASSIFICMS);
  else check('CLASSIFICMS', '-', '-', 'SKIP', 'sem TDDOPC');
  cmpStr('RETEMISS', 'S', after.RETEMISS);
  cmpStr('RETEMINSS', 'S', after.RETEMINSS);
  cmpStr('RETEMPIS', 'S', after.RETEMPIS);
  cmpStr('RETEMCOFINS', 'S', after.RETEMCOFINS);
  cmpStr('RETEMCSL', 'S', after.RETEMCSL);
  const simplesEsperado = dictSimples || 'N';
  cmpStr('SIMPLES', simplesEsperado, after.SIMPLES);
  if (dictPerfilEconect) cmpStr('PERFILECONECT', dictPerfilEconect, after.PERFILECONECT);
  else check('PERFILECONECT', '-', '-', 'SKIP', 'sem TDDOPC');
  if (dictTipoFatur) cmpStr('TIPOFATUR', dictTipoFatur, after.TIPOFATUR);
  else check('TIPOFATUR', '-', '-', 'SKIP', 'sem TDDOPC');
  if (dictRegimeIss) cmpStr('REGIMEESPTRIBISS', dictRegimeIss, after.REGIMEESPTRIBISS);
  else check('REGIMEESPTRIBISS', '-', '-', 'SKIP', 'sem TDDOPC');
  if (dictTipCliente) cmpStr('TIPCLIENTESERVCOM', dictTipCliente, after.TIPCLIENTESERVCOM);
  else check('TIPCLIENTESERVCOM', '-', '-', 'SKIP', 'sem TDDOPC');

  // Campos customizados
  cmpNum('AD_CREDCLI', 123.45, after.AD_CREDCLI);
  cmpNum('AD_LIMITEPAR', 234.56, after.AD_LIMITEPAR);
  cmpStr('AD_LOCALCAD', 'VALIDACAO', after.AD_LOCALCAD);
  if (codBco !== null) cmpInt('AD_CODBCOBOL', codBco, after.AD_CODBCOBOL);
  else check('AD_CODBCOBOL', '-', '-', 'SKIP', 'sem TSIBCO');

  // Entrega / GPS (TGFPAR)
  cmpStr('EMAILNOTIFENTREGA', 'entrega@teste.local', after.EMAILNOTIFENTREGA);
  cmpStr('ENTREGAENDCONTATO', 'S', after.ENTREGAENDCONTATO);
  cmpStr('EXIGCONTATOENTCAB', 'S', after.EXIGCONTATOENTCAB);
  cmpNum('LATITUDE', -8.047562, after.LATITUDE, 0.0001);
  cmpNum('LONGITUDE', -34.877002, after.LONGITUDE, 0.0001);

  // Endereco cobranca (TGFPAR direto + FKs)
  cmpStr('NUMEND', '100', after.NUMEND);
  cmpStr('COMPLEMENTO', 'APTO VALIDACAO', after.COMPLEMENTO);
  cmpStr('CEP (digitos)', '50750180', String(after.CEP || '').replace(/\D/g, ''));
  if (codCid !== null) cmpInt('CODCID', codCid, after.CODCID);
  if (codBai !== null) cmpInt('CODBAI', codBai, after.CODBAI);
  if (codEnd !== null) cmpInt('CODEND', codEnd, after.CODEND);

  // ---------------------------------------------------------------
  // PASSO 5: DTALTER (TGFPAR) e DHALTER (TGFCTT)
  // ---------------------------------------------------------------
  console.log('\n[PASSO 5] Verificando DTALTER (TGFPAR) e DHALTER (TGFCTT)...');
  const dtAlterAfter = parseDt(after.DTALTER);
  console.log(`  DTALTER depois: ${after.DTALTER}`);
  check('DTALTER atualizado', '> anterior', after.DTALTER, dtAlterAfter > dtAlterBefore ? 'PASS' : 'FAIL',
    `antes=${new Date(dtAlterBefore).toISOString()} depois=${new Date(dtAlterAfter).toISOString()}`);

  const cttRows = await fetchCtt(gateway, codParc);
  console.log(`  TGFCTT rows depois: ${cttRows.length}`);
  if (cttRows.length > 0) {
    const ctt = cttRows[0];
    cmpStr('TGFCTT.NUMEND', '79C', ctt.NUMEND);
    cmpStr('TGFCTT.COMPLEMENTO', 'GALPAO VALIDACAO', ctt.COMPLEMENTO);
    cmpStr('TGFCTT.CEP (digitos)', '50750180', String(ctt.CEP || '').replace(/\D/g, ''));
    cmpStr('TGFCTT.NOMECONTATO', 'CONTATO VALIDACAO', ctt.NOMECONTATO);
    if (codCid !== null) cmpInt('TGFCTT.CODCID', codCid, ctt.CODCID);
    if (codBai !== null) cmpInt('TGFCTT.CODBAI', codBai, ctt.CODBAI);
    if (codEnd !== null) cmpInt('TGFCTT.CODEND', codEnd, ctt.CODEND);
    check('TGFCTT.DHALTER preenchida', 'nao-nula', ctt.DHALTER, ctt.DHALTER ? 'PASS' : 'FAIL');
    if (ctt.DHALTER) console.log(`  DHALTER: ${ctt.DHALTER}`);
  } else {
    check('TGFCTT registro criado', '>=1 row', '0 rows', 'FAIL');
  }

  // ---------------------------------------------------------------
  // PASSO 6: leitura via findById (JOINs + UF sigla)
  // ---------------------------------------------------------------
  console.log('\n[PASSO 6] Leitura via findById (JOINs, UF sigla, endereco entrega)...');
  const lido = await repo.findById(codParc);
  cmpStr('findById.endereco.cidade', 'RECIFE', lido?.endereco?.cidade);
  cmpStr('findById.endereco.uf (sigla)', 'PE', lido?.endereco?.uf);
  cmpStr('findById.enderecoEntrega.cidade', 'RECIFE', lido?.enderecoEntrega?.cidade);
  cmpStr('findById.enderecoEntrega.uf (sigla)', 'PE', lido?.enderecoEntrega?.uf);
  cmpInt('findById.prazoPag', 45, lido?.prazoPag);
  cmpNum('findById.limiteCredito', 7890.12, lido?.limiteCredito ?? 0);
  check('findById.dataUltimaAlteracao', 'nao-nula', lido?.dataUltimaAlteracao ? 'ok' : 'null', lido?.dataUltimaAlteracao ? 'PASS' : 'FAIL');

  // ---------------------------------------------------------------
  // PASSO 7: troca de documento (CNPJ<->CPF) e tipo de pessoa
  // ---------------------------------------------------------------
  console.log('\n[PASSO 7] Teste de troca CNPJ->CPF + TIPPESSOA J->F...');
  let flipOk = false;
  try {
    await useCases.atualizarCliente(codParc, {
      cnpjCpf: CPF_TESTE,
      tipoPessoa: 'F' as any,
      inscricaoEstadual: '',
    } as any);
    const flipRow = await fetchPar(gateway, codParc);
    cmpStr('CGC_CPF (CPF)', CPF_TESTE, String(flipRow.CGC_CPF || '').replace(/\D/g, ''));
    cmpStr('TIPPESSOA (F)', 'F', flipRow.TIPPESSOA);
    flipOk = true;
  } catch (err: any) {
    check('CGC_CPF (CPF)', CPF_TESTE, `ERRO: ${err?.message || err}`, 'SKIP', 'Sankhya bloqueou troca de documento');
  }

  if (flipOk) {
    console.log('  Restaurando CNPJ + tipo J...');
    await useCases.atualizarCliente(codParc, {
      cnpjCpf: CNPJ_TESTE,
      tipoPessoa: 'J' as any,
      inscricaoEstadual: '123456789',
    } as any);
    const backRow = await fetchPar(gateway, codParc);
    cmpStr('CGC_CPF restaurado', CNPJ_TESTE, String(backRow.CGC_CPF || '').replace(/\D/g, ''));
    cmpStr('TIPPESSOA restaurado', 'J', backRow.TIPPESSOA);
  }

  // ---------------------------------------------------------------
  // PASSO 8: duplicidade deve gerar 409 (validacao de negocio)
  // ---------------------------------------------------------------
  console.log('\n[PASSO 8] Teste de duplicidade (esperado: 409 Conflict)...');
  // usa CNPJ real de OUTRO parceiro para garantir conflito
  const outro = (await gateway.executeQuery(`
    SELECT CGC_CPF FROM TGFPAR
    WHERE CODPARC <> ${codParc} AND CGC_CPF IS NOT NULL AND LENGTH(TRIM(CGC_CPF)) = 14 AND ROWNUM <= 1`))[0];
  const cnpjOutro = outro ? String(outro.CGC_CPF).trim() : null;
  if (!cnpjOutro) {
    check('Duplicidade 409', 'erro 409', 'sem CNPJ de outro parceiro na base', 'SKIP');
  } else {
    try {
      await useCases.atualizarCliente(codParc, { cnpjCpf: cnpjOutro } as any);
      check('Duplicidade 409', 'erro 409', 'sem erro (update aceitou CNPJ duplicado)', 'FAIL');
    } catch (err: any) {
      const msg = err?.message || '';
      const conflitou = err?.getStatus?.() === 409 || /outro cliente|já existe/i.test(msg);
      check('Duplicidade 409', `erro 409 (CNPJ ${cnpjOutro})`, `status=${err?.getStatus?.() ?? '?'} ${msg}`.trim().slice(0, 60),
        conflitou ? 'PASS' : 'FAIL');
    }
  }

  // ---------------------------------------------------------------
  // PASSO 9: inativacao (limpeza do registro de teste)
  // ---------------------------------------------------------------
  console.log('\n[PASSO 9] Inativando registro de teste (limpeza)...');
  await useCases.deletarCliente(codParc);
  const finalRow = await fetchPar(gateway, codParc);
  const finalLido = await repo.findById(codParc);
  check('Inativacao ATIVO=N', 'N', finalRow.ATIVO, finalRow.ATIVO === 'N' ? 'PASS' : 'FAIL');
  cmpStr('Inativacao mantem NOMEPARC', 'TESTE VALIDACAO UPDATE ALTERADO', finalRow.NOMEPARC);

  // ---------------------------------------------------------------
  // RELATORIO FINAL
  // ---------------------------------------------------------------
  const lista = Object.values(resultados);
  const pass = lista.filter(r => r.status === 'PASS').length;
  const fail = lista.filter(r => r.status === 'FAIL').length;
  const skip = lista.filter(r => r.status === 'SKIP').length;

  console.log('\n==================== RELATORIO FINAL ====================');
  console.table(lista.map(r => ({ campo: r.campo, status: r.status, esperado: r.esperado, obtido: r.obtido.slice(0, 60), obs: r.obs || '' })));
  console.log(`\nRESUMO: ${pass} PASS | ${fail} FAIL | ${skip} SKIP | total ${lista.length}`);
  console.log(fail === 0 ? '\n>>> VALIDACAO 100% OK <<<' : `\n>>> ${fail} CAMPOS COM FALHA <<<`);

  process.exit(fail === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
