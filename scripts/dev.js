#!/usr/bin/env node

const { spawn } = require('child_process');

// Start the Next.js dev server
const devServer = spawn('next', ['dev'], {
  stdio: ['pipe', 'inherit', 'inherit']
});

// Open browser after a delay
setTimeout(() => {
  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(opener, ['http://localhost:3000']);
}, 2000);

// Set up raw mode to capture single keypress
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

console.log('\n💡 Type "q" to quit the dev server\n');

process.stdin.on('data', (key) => {
  // Check if 'q' or 'Q' is pressed
  if (key === 'q' || key === 'Q') {
    console.log('\n\n👋 Shutting down dev server...\n');
    devServer.kill();
    process.exit(0);
  }
  
  // Handle Ctrl+C
  if (key === '\u0003') {
    console.log('\n\n👋 Shutting down dev server...\n');
    devServer.kill();
    process.exit(0);
  }
});

// Handle server exit
devServer.on('exit', (code) => {
  process.exit(code);
});
