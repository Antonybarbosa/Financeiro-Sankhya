async function checkServer() {
  try {
    const r = await fetch('http://localhost:3001/health');
    console.log('Backend Health Status:', r.status, await r.text());
  } catch (err: any) {
    console.error('Backend offline:', err?.message);
  }
}
checkServer();
