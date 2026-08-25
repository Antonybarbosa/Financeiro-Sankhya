import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function inspectDeliveryDict() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== Inspecionando campos da TGFPAR específicos de entrega no Dicionário ===\n');

  const fields = [
    'CODDETENT',
    'EMAILNOTIFENTREGA',
    'ENTREGAENDCONTATO',
    'EXIGCONTATOENTCAB',
    'PERMITEAGRUPEMENTREGA',
    'DIASTOLENTR',
    'LATITUDE',
    'LONGITUDE',
  ];

  const sql = `
    SELECT
        CAM.NUCAMPO,
        CAM.NOMECAMPO,
        CAM.DESCRCAMPO,
        CAM.TIPCAMPO,
        OPC.VALOR,
        OPC.OPCAO
    FROM TDDCAM CAM
    LEFT JOIN TDDOPC OPC ON OPC.NUCAMPO = CAM.NUCAMPO
    WHERE CAM.NOMETAB = 'TGFPAR'
      AND CAM.NOMECAMPO IN ('${fields.join("','")}')
    ORDER BY CAM.NOMECAMPO, OPC.ORDEM
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.table(list);
  } catch (err: any) {
    console.error('Erro ao inspecionar:', err?.message || err);
  }
}

inspectDeliveryDict().catch(console.error);
