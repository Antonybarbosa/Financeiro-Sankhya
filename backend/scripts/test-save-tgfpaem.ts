import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { ConfigService } from '@nestjs/config';

async function main() {
  const gw = new SankhyaGateway({ get: (k: string) => process.env[k] } as any as ConfigService);
  const testCodParc = 31547;
  const testCodEmp = 1; // Empresa 1

  console.log(`\n=== 1. Consultando empresas para o parceiro ${testCodParc} ===`);
  const initialRows = await gw.executeQuery(`
    SELECT PAEM.CODPARC, PAEM.CODEMP, EMP.NOMEFANTASIA AS NOMEEMP, PAEM.CLASSIFICMS
    FROM TGFPAEM PAEM
    INNER JOIN TSIEMP EMP ON EMP.CODEMP = PAEM.CODEMP
    WHERE PAEM.CODPARC = ${testCodParc}
  `);
  console.log('Registros iniciais:', initialRows);

  console.log(`\n=== 2. Adicionando Empresa ${testCodEmp} via DatasetSP.save ===`);
  const saveResult = await gw.saveChildRecord(
    'Parceiro',
    { CODPARC: String(testCodParc) },
    'ParceiroEmpresGrupoIcms',
    { CODPARC: String(testCodParc), CODEMP: String(testCodEmp) },
    ['CODPARC', 'CODEMP', 'CLASSIFICMS'],
    [String(testCodParc), String(testCodEmp), '1']
  );
  console.log('Resultado Save:', saveResult);

  console.log(`\n=== 3. Consultando após save ===`);
  const afterSaveRows = await gw.executeQuery(`
    SELECT PAEM.CODPARC, PAEM.CODEMP, EMP.NOMEFANTASIA AS NOMEEMP, PAEM.CLASSIFICMS
    FROM TGFPAEM PAEM
    INNER JOIN TSIEMP EMP ON EMP.CODEMP = PAEM.CODEMP
    WHERE PAEM.CODPARC = ${testCodParc}
  `);
  console.log('Registros após save:', afterSaveRows);

  console.log(`\n=== 4. Removendo registro via DatasetSP.removeRecord ===`);
  const removeResult = await gw.serviceCall('DatasetSP.removeRecord', {
    serviceName: 'DatasetSP.removeRecord',
    requestBody: {
      dataSetID: '052',
      entityName: 'ParceiroEmpresGrupoIcms',
      standAlone: false,
      pks: [{ CODEMP: String(testCodEmp), CODPARC: String(testCodParc) }],
      ignoreListenerMethods: '',
    },
  });
  console.log('Resultado Remove:', removeResult);

  console.log(`\n=== 5. Consultando após remove ===`);
  const afterRemoveRows = await gw.executeQuery(`
    SELECT PAEM.CODPARC, PAEM.CODEMP, EMP.NOMEFANTASIA AS NOMEEMP, PAEM.CLASSIFICMS
    FROM TGFPAEM PAEM
    INNER JOIN TSIEMP EMP ON EMP.CODEMP = PAEM.CODEMP
    WHERE PAEM.CODPARC = ${testCodParc}
  `);
  console.log('Registros após remove:', afterRemoveRows);

  process.exit(0);
}

main().catch(console.error);
