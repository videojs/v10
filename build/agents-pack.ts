import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { baseConfig } from './pack.ts';

/** Shared Node CLI build used by the HTML and React player packages. */
export function agentsPackConfig(): PackUserConfig {
  return {
    ...baseConfig,
    name: 'agents',
    entry: { agents: './src/agents.ts' },
    platform: 'node',
    format: 'es',
    outDir: 'dist/bin',
    clean: false,
    hash: false,
    banner: { js: '#!/usr/bin/env node' },
    deps: { alwaysBundle: ['@videojs/installation'] },
  };
}
