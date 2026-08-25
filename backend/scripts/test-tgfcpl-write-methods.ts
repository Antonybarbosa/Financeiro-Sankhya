/**
 * Testa métodos alternativos para gravar na TGFCPL:
 * 1. DbExplorerSP.executePreparedQuery com UPDATE
 * 2. MasterSP.execute (se disponível)
 * 3. Usar a entidade Parceiro com campos via CRUDServiceProvider.save  
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { ConfigService } from '@nestjs/config';

async function main() {
  const gw = new SankhyaGateway({ get: (k: string) => process.env[k] } as any as ConfigService);
  const CODPARC = 206;

  const antes = await gw.executeQuery(`SELECT NUMENTREGA, CEPENTREGA FROM TGFCPL WHERE CODPARC = ${CODPARC}`);
  console.log('Antes:', JSON.stringify(antes[0]));

  // Teste 1: DbExplorerSP.executePreparedQuery
  console.log('\n--- Teste 1: DbExplorerSP.executePreparedQuery ---');
  try {
    const token = await gw.getToken();
    const url = `https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DbExplorerSP.executePreparedQuery&outputType=json`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceName: 'DbExplorerSP.executePreparedQuery',
        requestBody: {
          sql: `UPDATE TGFCPL SET NUMENTREGA = ? WHERE CODPARC = ?`,
          params: { param: [{ $: '999TESTE' }, { $: String(CODPARC) }] }
        }
      })
    });
    const data = await res.json();
    console.log('Resultado:', JSON.stringify(data).substring(0, 300));
  } catch (e: any) { console.log('Erro:', e?.message); }

  // Teste 2: CRUDServiceProvider.save (diferente do DatasetSP.save)
  console.log('\n--- Teste 2: CRUDServiceProvider.save ---');
  try {
    const res = await gw.serviceCall('CRUDServiceProvider.save', {
      serviceName: 'CRUDServiceProvider.save',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          includePresentationFields: 'S',
          dataRow: {
            localFields: {},
            localRow: { CODPARC: { $: String(CODPARC) } }
          },
          entity: [
            { path: '', fieldset: { list: 'CODPARC' } }
          ]
        }
      }
    });
    console.log('Resultado:', JSON.stringify(res).substring(0, 300));
  } catch (e: any) { console.log('Erro:', e?.message); }

  // Teste 3: Usar o mesmo CODPARC com entidade Parceiro mas via CRUDServiceProvider.save nativo
  console.log('\n--- Teste 3: Parceiro com campo TGFCPL via CRUDServiceProvider nativo ---');
  try {
    const token = await gw.getToken();
    const url = `https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.save&outputType=json`;
    const payload = {
      serviceName: 'CRUDServiceProvider.save',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          dataRow: {
            localFields: { CODPARC: `${CODPARC}`, NUMENTREGA: '888CRUDTEST', CEPENTREGA: '50020040' },
            localRow: { CODPARC: { $: String(CODPARC) }, NUMENTREGA: { $: '888CRUDTEST' }, CEPENTREGA: { $: '50020040' } }
          }
        }
      }
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Resultado:', JSON.stringify(data).substring(0, 500));
  } catch (e: any) { console.log('Erro:', e?.message); }

  // Teste 4: Busca a entidade CPL como filho do Parceiro pelo nome mais comum em documentações
  console.log('\n--- Teste 4: Entidade "Parceiro" com campo "Cpl.NUMENTREGA" via DatasetSP.save ---');
  for (const prefixo of ['Cpl', 'cpl', 'CPL', 'EndEnt', 'Entrega', 'DadosCpl', 'CplPar']) {
    try {
      await gw.saveRecord('Parceiro', { CODPARC }, [`${prefixo}.NUMENTREGA`], ['TEST']);
      console.log(`✅ SUCESSO: campo "${prefixo}.NUMENTREGA" na entidade Parceiro!`);
    } catch (e: any) { console.log(`❌ "${prefixo}.NUMENTREGA": ${e?.message?.slice(0,80)}`); }
  }

  const depois = await gw.executeQuery(`SELECT NUMENTREGA, CEPENTREGA FROM TGFCPL WHERE CODPARC = ${CODPARC}`);
  console.log('\nDepois:', JSON.stringify(depois[0]));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
