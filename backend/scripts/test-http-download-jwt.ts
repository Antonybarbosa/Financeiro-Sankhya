import * as jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testHttpDownloadJwt() {
  const secret = process.env.JWT_SECRET || 'financeiro_sankhya_jwt_dev_min_32_chars_trocar_em_prod';
  const token = jwt.sign({ codusu: 1, username: 'teste.e2e' }, secret, { expiresIn: '5m' });

  const url = 'http://localhost:3001/api/clientes/6614/anexos/7/arquivo';
  console.log('GET', url);
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Status:', res.status, res.statusText);
    console.log('Content-Type:', res.headers.get('content-type'));
    console.log('Content-Disposition:', res.headers.get('content-disposition'));
    const text = await res.text();
    console.log('Body preview:', text.slice(0, 300));
  } catch (err: any) {
    console.error('Fetch error:', err?.message || err);
  }
}

testHttpDownloadJwt().catch(console.error);
