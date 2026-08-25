import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());

  console.log('=== TESTING TSIANX INSERTION WITH MAX(NUATTACH)+1 ===');

  try {
    // 1. Get MAX(NUATTACH)
    const maxResult = await gateway.executeQuery(`SELECT NVL(MAX(NUATTACH), 0) + 1 AS NEXT_ID FROM TSIANX`);
    console.log('Max result:', maxResult);
    const nuAttach = maxResult[0]?.NEXT_ID;

    if (nuAttach) {
      // 2. Insert test attachment for partner 6614
      await gateway.executeQuery(`
        INSERT INTO TSIANX (
          NUATTACH, NOMEINSTANCIA, CHAVEARQUIVO, NOMEARQUIVO, DESCRICAO,
          RESOURCEID, TIPOAPRES, TIPOACESSO, CODUSU, DHCAD, PKREGISTRO
        ) VALUES (
          ${nuAttach},
          'Parceiro',
          '${nuAttach}_documento_teste.pdf',
          'documento_teste.pdf',
          'Documento Teste Inclusao Módulo',
          'br.com.sankhya.core.cad.parceiros',
          'LOC',
          'ALL',
          0,
          SYSDATE,
          '6614_Parceiro'
        )
      `);
      console.log(`Successfully inserted test attachment NUATTACH=${nuAttach}`);

      // 3. Query back
      const readBack = await gateway.executeQuery(`
        SELECT NUATTACH, NOMEINSTANCIA, PKREGISTRO, NOMEARQUIVO, DESCRICAO, TIPOACESSO, TIPOAPRES, TO_CHAR(DHCAD, 'DD/MM/YYYY HH24:MI:SS') AS DHCAD
        FROM TSIANX
        WHERE NUATTACH = ${nuAttach}
      `);
      console.log('Read back inserted record:', readBack);

      // 4. Clean up test attachment
      await gateway.executeQuery(`DELETE FROM TSIANX WHERE NUATTACH = ${nuAttach}`);
      console.log(`Successfully cleaned up NUATTACH=${nuAttach}`);
    }

  } catch (err: any) {
    console.error('Error testing TSIANX insertion:', err?.message || err);
  }
}

bootstrap();
