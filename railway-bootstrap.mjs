import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

if (!existsSync('source.tgz')) {
  throw new Error('source.tgz is missing');
}

console.log('Extracting application source...');
execFileSync('tar', ['-xzf', 'source.tgz'], { stdio: 'inherit' });
console.log('Application source extracted.');
