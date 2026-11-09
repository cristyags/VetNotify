import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig, devices } from '@playwright/test';

if (existsSync('.env')) loadEnvFile('.env');
export default defineConfig({
  testDir:'./tests/e2e',
  timeout:120000,
  expect:{timeout:15000},
  workers:1,
  reporter:[['list']],
  use:{
    baseURL:process.env.API_URL ?? 'http://localhost:'+(process.env.VET_PORT??'18080'),
    channel:process.platform==='win32' ? 'chrome' : undefined,
    viewport:{width:1440,height:970},
    trace:'retain-on-failure',
  },
  projects:[{name:'Chrome',use:{...devices['Desktop Chrome'],viewport:{width:1440,height:970}}}],
});
