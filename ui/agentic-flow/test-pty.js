#!/usr/bin/env node

import pty from 'node-pty';

console.log('Testing node-pty...');

try {
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  console.log(`Platform: ${process.platform}`);
  console.log(`Shell: ${shell}`);
  
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: process.env
  });
  
  console.log('✅ PTY process created successfully');
  console.log(`PID: ${ptyProcess.pid}`);
  
  ptyProcess.onData((data) => {
    console.log('PTY Output:', data);
  });
  
  ptyProcess.onExit(({ exitCode, signal }) => {
    console.log(`PTY exited with code ${exitCode}, signal ${signal}`);
    process.exit(0);
  });
  
  // Send a test command
  setTimeout(() => {
    console.log('Sending test command: echo "Hello from PTY"');
    ptyProcess.write('echo "Hello from PTY"\r');
    
    setTimeout(() => {
      console.log('Sending exit command');
      ptyProcess.write('exit\r');
    }, 1000);
  }, 500);
  
} catch (error) {
  console.error('❌ Failed to create PTY:', error);
  console.error('Error details:', {
    message: error.message,
    code: error.code,
    stack: error.stack
  });
}