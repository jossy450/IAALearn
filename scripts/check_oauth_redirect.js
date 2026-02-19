const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/google',
  method: 'GET',
};

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  if (res.headers.location) {
    console.log('Redirect location:', res.headers.location);
  }
  res.on('data', () => {});
  res.on('end', () => process.exit(0));
});

req.on('error', (e) => {
  console.error('Request error:', e.message);
  process.exit(1);
});

req.end();
