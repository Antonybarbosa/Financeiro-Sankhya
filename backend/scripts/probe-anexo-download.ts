import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function bootstrap() {
  const gateway = new SankhyaGateway(new ConfigService());

  try {
    // 1. Busca CHAVEARQUIVO do anexo nativo
    const rows = await gateway.executeQuery(`
      SELECT NUATTACH, NOMEARQUIVO, CHAVEARQUIVO
      FROM TSIANX
      WHERE NUATTACH = 7
    `);
    const anexo = rows[0];
    console.log('Anexo:', JSON.stringify(anexo));
    if (!anexo?.CHAVEARQUIVO) {
      console.log('Sem CHAVEARQUIVO — nada a baixar');
      return;
    }

    // 2. Download via visualizadorArquivos.mge (gateway, Bearer)
    const token = await gateway.getToken();
    const url = `${process.env.GATEWAY_URL}/gateway/v1/mge/visualizadorArquivos.mge?hidemail=S&download=S&chaveArquivo=${anexo.CHAVEARQUIVO}`;
    console.log('GET', url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Status:', res.status, res.statusText);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Content-Disposition:', res.headers.get('content-disposition'));
    const buf = Buffer.from(await res.arrayBuffer());
    console.log('Bytes:', buf.length);
    console.log('Primeiros 8 bytes (hex):', buf.subarray(0, 8).toString('hex'));
    console.log('É PDF (%PDF):', buf.subarray(0, 4).toString('ascii') === '%PDF');
    if (res.status !== 200) {
      console.log('Body:', buf.toString('utf-8').slice(0, 500));
    }
  } catch (err: any) {
    console.error('Probe failed:', err?.message || err);
  }
}

bootstrap();
