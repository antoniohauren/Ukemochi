// Dev only: ng serve for both apps. If one dies, stop the other and exit non-zero so compose restarts us.
import { spawn } from 'node:child_process';

const children = ['waitress', 'admin'].map((app) =>
  spawn('ng', ['serve', app], { stdio: 'inherit' }),
);

const stop = (code) => {
  for (const child of children) child.kill();
  process.exit(code);
};

for (const child of children) child.on('exit', (code) => stop(code || 1));
process.on('SIGTERM', () => stop(0));
process.on('SIGINT', () => stop(0));
