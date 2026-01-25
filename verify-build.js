#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Build Verification Script ===');
console.log('Current directory:', process.cwd());
console.log('__dirname:', __dirname);

// Check for client dist directory
const distPath = path.join(__dirname, 'client', 'dist');
console.log('\nChecking for client/dist at:', distPath);

if (fs.existsSync(distPath)) {
  console.log('✅ client/dist directory exists');
  
  // Check for index.html
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    console.log('✅ index.html found');
  } else {
    console.error('❌ index.html NOT found');
    process.exit(1);
  }
  
  // List contents
  console.log('\nContents of client/dist:');
  const files = fs.readdirSync(distPath);
  files.forEach(file => {
    const filePath = path.join(distPath, file);
    const stats = fs.statSync(filePath);
    const type = stats.isDirectory() ? 'DIR ' : 'FILE';
    console.log(`  ${type} ${file}`);
  });
  
  console.log('\n✅ Build verification successful!');
} else {
  console.error('❌ client/dist directory NOT found');
  console.error('\nAvailable directories:');
  
  try {
    const rootContents = fs.readdirSync(__dirname);
    rootContents.forEach(item => {
      const itemPath = path.join(__dirname, item);
      if (fs.statSync(itemPath).isDirectory()) {
        console.error(`  - ${item}/`);
      }
    });
    
    if (fs.existsSync(path.join(__dirname, 'client'))) {
      console.error('\nContents of client/:');
      const clientContents = fs.readdirSync(path.join(__dirname, 'client'));
      clientContents.forEach(item => {
        console.error(`  - ${item}`);
      });
    }
  } catch (e) {
    console.error('Error listing directories:', e.message);
  }
  
  process.exit(1);
}
