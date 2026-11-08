import { cpSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.json'], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
mkdirSync('dist-api/packages/db/migrations', { recursive: true });
cpSync('packages/db/migrations', 'dist-api/packages/db/migrations', { recursive: true });
