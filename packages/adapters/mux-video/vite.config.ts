import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../../build/pack.ts';
import { cachedTaskInputs, packageTestTask, workspaceTaskDependencies } from '../../../build/task.ts';

const createPackConfig = (mode: PackageBuildMode): PackUserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  // `@videojs/mux` is a private workspace package: inline it (code and declarations) rather than depend on it.
  deps: {
    alwaysBundle: ['@videojs/mux'],
    dts: { alwaysBundle: ['@videojs/mux'] },
  },
  entry: { index: './src/index.ts', spf: './src/spf/index.ts' },
});

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: 'vp pack',
        dependsOn: workspaceTaskDependencies(),
        input: cachedTaskInputs,
        output: ['dist/**'],
      },
      'test:ci': packageTestTask(),
    },
  },
  define: {
    __DEV__: 'true',
  },
  test: {
    environment: 'jsdom',
  },
  pack: packageBuildModes.map(createPackConfig),
});
