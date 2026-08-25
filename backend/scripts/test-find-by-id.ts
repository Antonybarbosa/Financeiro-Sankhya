import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import { SankhyaClienteRepository } from '../src/infrastructure/repositories/sankhya-cliente.repository';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testFindById() {
  const gateway = new SankhyaGateway(new ConfigService());
  const repo = new SankhyaClienteRepository(gateway);

  console.log('=== Buscando cliente com CODBCO / AD_CODBCOBOL preenchido ===\n');

  // Buscar primeiro um parceiro que tenha CODBCO ou AD_CODBCOBOL
  const sql = `
    SELECT CODPARC, CODBCO, AD_CODBCOBOL
    FROM TGFPAR
    WHERE (CODBCO IS NOT NULL AND CODBCO > 0)
       OR (AD_CODBCOBOL IS NOT NULL AND AD_CODBCOBOL > 0)
       AND ROWNUM <= 5
  `;

  try {
    const list = await gateway.executeQuery(sql);
    console.log('Clientes com banco encontrados:', list);

    if (list.length > 0) {
      const codParc = parseInt(list[0].CODPARC);
      const cliente = await repo.findById(codParc);
      console.log('\nObjeto Cliente retornado pelo Repository:');
      console.log({
        codParc: cliente?.codParc,
        nomeParc: cliente?.nomeParc,
        codBco: cliente?.codBco,
        nomeBco: cliente?.nomeBco,
        adCodBcoBol: cliente?.adCodBcoBol,
        adNomeBcoBol: cliente?.adNomeBcoBol,
        codVend: cliente?.codVend,
        nomeVend: cliente?.nomeVend,
      });
    }
  } catch (err: any) {
    console.error('Erro no teste:', err?.message || err);
  }
}

testFindById().catch(console.error);
