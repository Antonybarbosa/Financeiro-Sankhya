import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== VERIFYING NUATTACH=5 REMOVAL ===');

  try {
    const res = await gateway.executeQuery(`
      SELECT NUATTACH, NOMEARQUIVO, DESCRICAO
      FROM TSIANX
      WHERE NUATTACH = 5
    `);
    console.log('QueryResult for NUATTACH=5:', JSON.stringify(res, null, 2));

  } catch (err: any) {
    console.error('Error querying TSIANX:', err?.message || err);
  }
}

bootstrap();
