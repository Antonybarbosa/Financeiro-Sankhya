import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runQuery() {
  console.log('=== Executando Consulta no Dicionário de Dados Sankhya (TDDCAM/TDDTAB p/ TGFPAR) ===\n');

  const configService = new ConfigService();
  const gateway = new SankhyaGateway(configService);

  const sql = `
    SELECT
        CAM.NOMETAB,
        TAB.DESCRTAB,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO,
        CASE CAM.TIPCAMPO
            WHEN 'B' THEN 'BLOB'
            WHEN 'C' THEN 'CLOB'
            WHEN 'D' THEN 'DATA'
            WHEN 'F' THEN 'DECIMAL'
            WHEN 'I' THEN 'INTEIRO'
            WHEN 'H' THEN 'DATA/HORA'
            WHEN 'S' THEN 'TEXTO'
            WHEN 'T' THEN 'HORA'
            ELSE 'NÃO IDENTIFICADO'
        END AS TIPO_DESCRICAO,
        CAM.EXPRESSAO,
        CAM.PERMITEPESQUISA
    FROM TDDCAM CAM
    LEFT JOIN TDDTAB TAB
           ON TAB.NOMETAB = CAM.NOMETAB
    WHERE CAM.NOMETAB = 'TGFPAR'
    ORDER BY CAM.NOMECAMPO
  `;

  try {
    const result = await gateway.executeQuery(sql);
    console.log(`Total de campos encontrados na TGFPAR: ${result.length}\n`);

    console.table(
      result.slice(0, 30).map((r) => ({
        Campo: r.NOMECAMPO,
        Descrição: r.DESCRCAMPO,
        Tipo: r.TIPO_DESCRICAO,
        Pesquisa: r.PERMITEPESQUISA,
      })),
    );

    if (result.length > 30) {
      console.log(`\n... mais ${result.length - 30} campos carregados com sucesso.`);
    }

    return result;
  } catch (err: any) {
    console.error('Erro ao executar consulta:', err?.message || err);
  }
}

runQuery().catch(console.error);
