import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const gateway = new SankhyaGateway(new ConfigService());
  const res = await gateway.executeQuery(`
    SELECT
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
  `);

  console.log(`Total de opções encontradas em TDDOPC para a tabela TGFPAR: ${res.length}\n`);

  const fieldsMap: Record<string, { descr: string; options: string[] }> = {};

  res.forEach((r: any) => {
    const field = r.NOMECAMPO;
    if (!fieldsMap[field]) {
      fieldsMap[field] = { descr: r.DESCRCAMPO, options: [] };
    }
    fieldsMap[field].options.push(`[${r.VALOR}] ${r.OPCAO}${r.PADRAO === 'S' ? ' (Padrão)' : ''}`);
  });

  const summary = Object.entries(fieldsMap).map(([campo, data]) => ({
    Campo: campo,
    Descrição: data.descr,
    QtdOpcoes: data.options.length,
    Opcoes: data.options.join(' | '),
  }));

  console.table(summary);
  return summary;
}

run().catch(console.error);
