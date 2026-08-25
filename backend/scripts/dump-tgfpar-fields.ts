import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function dumpFields() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Consultando TODOS os 310 campos da TGFPAR no Dicionário Sankhya ===\n');

  const sql = `
    SELECT
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
        CAM.PERMITEPESQUISA
    FROM TDDCAM CAM
    WHERE CAM.NOMETAB = 'TGFPAR'
    ORDER BY CAM.NOMECAMPO
  `;

  try {
    const res = await gateway.executeQuery(sql);
    console.log(`Retornados ${res.length} campos.`);

    const artifactPath = path.join(
      'C:\\Users\\inovace\\.gemini\\antigravity-ide\\brain\\e50c4f1e-75bc-4a91-884e-afb8929b8df0',
      'tgfpar_fields_list.json',
    );
    fs.writeFileSync(artifactPath, JSON.stringify(res, null, 2), 'utf-8');
    console.log(`Salvo em: ${artifactPath}`);
  } catch (err: any) {
    console.error('Erro ao listar campos:', err?.message || err);
  }
}

dumpFields().catch(console.error);
