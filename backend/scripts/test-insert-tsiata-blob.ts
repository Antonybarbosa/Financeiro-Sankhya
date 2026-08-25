import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

/**
 * Testa se conseguimos gravar BLOB diretamente na TSIATA.CONTEUDO via SQL.
 * Sankhya usa a API DbExplorerSP.executeQuery que suporta apenas SELECT.
 * Precisamos testar via DatasetSP ou outra forma de INSERT/UPDATE.
 */
async function testInsertTsiataBlob() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== TESTANDO INSERT/UPDATE DE BLOB NA TSIATA ===\n');

  // 1. Tenta via DatasetSP.saveRecord
  console.log('1. Testando via DatasetSP.saveRecord...');
  try {
    const smallPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Teste) >>\nendobj\n%%EOF');
    const hexBlob = smallPdf.toString('hex').toUpperCase();

    const res = await (gateway as any).serviceCall('DatasetSP.saveRecord', {
      serviceName: 'DatasetSP.saveRecord',
      requestBody: {
        dataSet: {
          $: {
            rootEntity: 'Anexo',
            includePresentationFields: 'N',
          },
          entity: {
            $: { path: 'Anexo' },
            f0: { $: 'P' },       // TIPO = P (Parceiro)
            f1: { $: 'Teste' },   // DESCRICAO
            f2: { $: 'teste_blob.pdf' }, // ARQUIVO
            f3: { $: hexBlob },   // CONTEUDO em hex
          },
        },
      },
    });
    console.log('  DatasetSP.saveRecord resposta:', JSON.stringify(res?.responseBody || res, null, 2));
  } catch (err: any) {
    console.log('  DatasetSP.saveRecord erro:', err?.message?.substring(0, 200));
  }

  // 2. Testa via DbExplorerSP.executeQuery com UPDATE (provavelmente não permitido)
  console.log('\n2. Testando via DbExplorerSP.executeQuery com UPDATE (somente leitura)...');
  try {
    const res2 = await gateway.executeQuery(`
      INSERT INTO TSIATA (CODATA, TIPO, DESCRICAO, ARQUIVO)
      VALUES (99999, 'P', 'Teste Blob API', 'teste_api.txt')
    `);
    console.log('  INSERT resposta:', res2);
  } catch (err: any) {
    console.log('  INSERT erro (esperado - somente leitura):', err?.message?.substring(0, 200));
  }

  // 3. Testa via AnexoSistemaSP — outros métodos
  console.log('\n3. Listando métodos disponíveis no AnexoSistemaSP...');
  const methods = [
    'AnexoSistemaSP.incluir',
    'AnexoSistemaSP.gravar',
    'AnexoSistemaSP.inserir',
    'AnexoSistemaSP.save',
    'AnexoSistemaSP.upload',
  ];
  for (const method of methods) {
    try {
      await (gateway as any).serviceCall(method, { serviceName: method, requestBody: {} }, 'mge');
      console.log(`  ${method}: EXISTE!`);
    } catch (err: any) {
      const msg = err?.message?.substring(0, 150);
      if (msg?.includes('não encontrado') || msg?.includes('not found')) {
        console.log(`  ${method}: ❌ Não existe`);
      } else {
        console.log(`  ${method}: ✅ Existe (erro de parâmetro): ${msg}`);
      }
    }
  }
}

testInsertTsiataBlob().catch(console.error);
