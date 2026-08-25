import * as http from 'http';
import { ConfigService } from '@nestjs/config';
import { SankhyaGateway } from '../src/infrastructure/sankhya/sankhya.gateway';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const ECHO_PORT = 8123;

async function bootstrap() {
  const requests: string[] = [];

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      const head = [
        `${req.method} ${req.url}`,
        ...Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`),
      ].join('\n');
      const bodyAscii = body.toString('latin1').replace(/\r\n/g, '⏎\n');
      requests.push(`${head}\n---BODY(${body.length}b)---\n${bodyAscii}`);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<html><script>window.close();</script></html>');
    });
  });

  await new Promise<void>((r) => server.listen(ECHO_PORT, () => r()));
  const echoUrl = `http://127.0.0.1:${ECHO_PORT}`;

  // Aponta AMBOS os fluxos para o echo
  process.env.GATEWAY_URL = echoUrl;

  // RAW upload
  const fd = new FormData();
  fd.append('arquivo', new Blob([Buffer.from('RAW-BYTES\n', 'utf-8')], { type: 'application/octet-stream' }), 'raw_teste.txt');
  await fetch(`${echoUrl}/gateway/v1/mge/sessionUpload.mge?sessionkey=SK&fitem=S&salvar=S&useCache=N`, {
    method: 'POST',
    headers: { Authorization: 'Bearer TOK-RAW', Accept: 'text/html' },
    body: fd,
  });
  requests.push('===== FIM RAW =====');

  // Gateway upload (com URL do echo)
  const gw = new SankhyaGateway(new ConfigService());
  // @ts-ignore forçar token para não chamar /authenticate do echo
  (gw as any).token = 'TOK-GW';
  (gw as any).tokenExpiry = Date.now() + 60000;
  await gw.uploadSessionFile('SK', 'gw_teste.txt', Buffer.from('GW-BYTES\n', 'utf-8'), 'application/octet-stream');
  requests.push('===== FIM GATEWAY =====');

  server.close();
  console.log(requests.join('\n\n'));
}

bootstrap().catch((e) => console.error('FALHA:', e));
