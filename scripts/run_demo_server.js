const { spawn } = require('child_process');

const env = Object.assign({}, process.env, {
  DEMO_MODE: 'true',
  NODE_ENV: 'development',
  CLIENT_URL: 'http://localhost:5173',
});

const node = spawn(process.execPath, ['server/index.js'], {
  env,
  stdio: 'inherit',
});

node.on('close', (code) => {
  console.log(`server process exited with code ${code}`);
});

// Graceful shutdown on SIGINT
process.on('SIGINT', () => {
  node.kill('SIGINT');
  process.exit();
});
