import { spawn } from 'node:child_process';

console.log('Starting NEXUS Backend and Frontend dev servers...');

const backend = spawn('npm', ['run', 'dev', '-w', 'backend'], {
  stdio: 'inherit',
  shell: true
});

const frontend = spawn('npm', ['run', 'dev', '-w', 'frontend'], {
  stdio: 'inherit',
  shell: true
});

backend.on('error', err => console.error('Backend process error:', err));
frontend.on('error', err => console.error('Frontend process error:', err));

function cleanup() {
  try { backend.kill(); } catch {}
  try { frontend.kill(); } catch {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

