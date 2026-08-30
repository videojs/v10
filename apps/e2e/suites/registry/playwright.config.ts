import { resolve } from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { suiteConfig } from '../../shared/playwright.ts';
import { registryConsumerProjects } from './projects.ts';

export default defineConfig({
  ...suiteConfig('registry'),
  testDir: resolve(import.meta.dirname, 'tests'),
  globalSetup: resolve(import.meta.dirname, 'setup/global.ts'),
  projects: registryConsumerProjects.map((project) => ({
    name: project.name,
    use: {
      ...devices['Desktop Chrome'],
      baseURL: `http://127.0.0.1:${project.port}`,
    },
  })),
  workers: 1,
});
