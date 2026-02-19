(async ()=>{
  const body = { email: `test-${Date.now()}@example.com`, password: "Password1A", fullName: "Test User" };
  try {
    const res = await fetch('https://iaalearn-cloud.fly.dev/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log(text);
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
