import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function searchIcmsFields() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Buscando todos os campos da TGFPAR relacionados a ICMS / Classificação / Tributação ===\n');

  const sql = `
    SELECT
        CAM.NOMETAB,
        CAM.NUCAMPO,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB = 'TGFPAR'
      AND (
        UPPER(CAM.NOMECAMPO) LIKE '%ICMS%'
        OR UPPER(CAM.NOMECAMPO) LIKE '%CLASS%'
        OR UPPER(CAM.NOMECAMPO) LIKE '%TRIB%'
        OR UPPER(CAM.NOMECAMPO) LIKE '%FISCAL%'
        OR UPPER(CAM.DESCRCAMPO) LIKE '%ICMS%'
        OR UPPER(CAM.DESCRCAMPO) LIKE '%CLASSIF%'
      )
    ORDER BY CAM.NOMECAMPO
  `;

  try {
    const res = await gateway.executeQuery(sql);
    console.log(`Encontrados ${res.length} campos correspondentes na TGFPAR:\n`);
    console.table(res);

    // Agora buscar se algum desses campos encontrados possui opções na TDDOPC
    if (res.length > 0) {
      const nucampos = res.map((r: any) => r.NUCAMPO).join(',');
      const sqlOpc = `
        SELECT
            CAM.NOMECAMPO,
            CAM.DESCRCAMPO,
            OPC.VALOR,
            OPC.OPCAO
        FROM TDDCAM CAM
        INNER JOIN TDDOPC OPC ON OPC.NUCAMPO = CAM.NUCAMPO
        WHERE CAM.NOMETAB = 'TGFPAR'
          AND CAM.NUCAMPO IN (${nucampos})
        ORDER BY CAM.NOMECAMPO, OPC.ORDEM
      `;
      const resOpc = await gateway.executeQuery(sqlOpc);
      console.log(`\nOpções na TDDOPC para esses campos (${resOpc.length} opções):`);
      console.table(resOpc);
    }
  } catch (err: any) {
    console.error('Erro na busca:', err?.message || err);
  }
}

searchIcmsFields().catch(console.error);
