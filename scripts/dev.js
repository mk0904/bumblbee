import { spawn } from 'node:child_process';
const children = ['dev:backend', 'dev:frontend'].map((script) =>
  spawn('npm', ['run', script], { stdio: 'inherit', env: process.env }),
);
let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
};
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, stop);
for (const child of children)
  child.on('exit', (code) => {
    if (!stopping) {
      process.exitCode = code || 1;
      stop();
    }
  });
