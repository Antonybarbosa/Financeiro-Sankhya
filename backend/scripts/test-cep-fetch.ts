async function testCep() {
  const ceps = ['50020040', '01001000', '52060105'];

  for (const cep of ceps) {
    console.log(`Buscando ViaCEP (${cep})...`);
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await res.json();
    console.log('ViaCEP data:', data);

    console.log(`Buscando BrasilAPI GPS (${cep})...`);
    const resB = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
    if (resB.ok) {
      const dataB = await resB.json();
      console.log('BrasilAPI data:', {
        city: dataB.city,
        state: dataB.state,
        coords: dataB.location?.coordinates
      });
    }
    console.log('--------------------------------------------------');
  }
}

testCep().catch(console.error);
