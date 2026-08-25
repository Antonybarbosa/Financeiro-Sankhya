import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const gateway = new SankhyaGateway(new ConfigService());
  const rows = await gateway.executeQuery(`
    SELECT CAM.NOMECAMPO, CAM.DESCRCAMPO, OPC.VALOR, OPC.OPCAO, OPC.PADRAO
    FROM TDDCAM CAM
    JOIN TDDOPC OPC ON OPC.NUCAMPO = CAM.NUCAMPO
    WHERE CAM.NOMETAB = 'TGFPAR' AND CAM.NOMECAMPO IN ('DESCBONIF','DESCFIN')
    ORDER BY CAM.NOMECAMPO, OPC.ORDEM`);
  console.table(rows);
}

main().catch(console.error);
