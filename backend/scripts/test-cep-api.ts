import { buscarCepViaApi } from '../../frontend/lib/api';

async function testCepApi() {
  console.log('=== Testando busca de CEP via API (ViaCEP / BrasilAPI) ===\n');

  const ceps = ['50020-040', '01001-000', '52060-105'];

  for (const cep of ceps) {
    console.log(`Buscando CEP: ${cep}...`);
    const res = await buscarCepViaApi(cep);
    console.log('Resultado:', res);
    console.log('---');
  }
}

testCepApi().catch(console.error);
