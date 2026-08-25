import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runQuery() {
  console.log('=== Executando Consulta de Opções de Campos (TDDOPC/TDDCAM) para TGFPAR ===\n');

  const configService = new ConfigService();
  const gateway = new SankhyaGateway(configService);

  const sql = `
    SELECT
        CAM.NOMETAB,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        OPC.VALOR,
        OPC.OPCAO,
        OPC.PADRAO,
        OPC.ORDEM
    FROM TDDCAM CAM
    INNER JOIN TDDOPC OPC
            ON OPC.NUCAMPO = CAM.NUCAMPO
    WHERE CAM.NOMETAB = 'TGFPAR'
    ORDER BY CAM.NOMECAMPO, OPC.ORDEM
  `;

  try {
    const result = await gateway.executeQuery(sql);
    console.log(`Total de opções encontradas para campos da TGFPAR: ${result.length}\n`);

    const fieldOptionsMap: Record<string, { descr: string; options: Array<{ valor: string; opcao: string; padrao: string }> }> = {};

    result.forEach((r: any) => {
      const campo = r.NOMECAMPO;
      if (!fieldOptionsMap[campo]) {
        fieldOptionsMap[campo] = {
          descr: r.DESCRCAMPO,
          options: [],
        };
      }
      fieldOptionsMap[campo].options.push({
        valor: r.VALOR,
        opcao: r.OPCAO,
        padrao: r.PADRAO,
      });
    });

    console.log('=== OPÇÕES DO CAMPO CLASSIFCMS ===');
    if (fieldOptionsMap['CLASSIFCMS']) {
      console.log(`📌 CLASSIFCMS (${fieldOptionsMap['CLASSIFCMS'].descr}):`);
      fieldOptionsMap['CLASSIFCMS'].options.forEach(opt => {
        console.log(`   └─ [${opt.valor}] ${opt.opcao}`);
      });
    } else {
      console.log('Nenhuma opção em TDDOPC para CLASSIFCMS');
    }

    console.log('\n=== OUTROS CAMPOS COM OPÇÕES NO DICIONÁRIO ===');
    Object.entries(fieldOptionsMap).forEach(([campo, info]) => {
      console.log(`• ${campo} (${info.descr}): ${info.options.map(o => `${o.valor}=${o.opcao}`).join(', ')}`);
    });

    return fieldOptionsMap;
  } catch (err: any) {
    console.error('Erro ao executar consulta de opções:', err?.message || err);
  }
}

runQuery().catch(console.error);
