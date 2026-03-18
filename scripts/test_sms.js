(async () => {
  const phone = process.argv[2] || '+1234567890';
  const email = process.argv[3] || 'test@example.com';
  
  try {
    const res = await fetch('https://iaalearn-1.fly.dev/api/auth/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        email, 
        phone,
        deliveryMethod: 'sms'
      }),
    });
    const data = await res.json();
    console.log('STATUS', res.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
