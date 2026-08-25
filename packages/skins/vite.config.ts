import { globSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { cachedTaskInputs, packageTestTask, workspaceTaskDependencies } from '../../build/task.ts';

const packageDir = import.meta.dirname;
const skinsDir = resolve(packageDir, 'src');
const entries = Object.fromEntries(
  globSync('src/**/*.tailwind.ts', { cwd: packageDir }).map((file) => {
    const key = file.replace('src/', '').replace('.ts', '');

    return [key, file];
  })
);

const createPackConfig = (mode: PackageBuildMode): PackUserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  name: 'skins',
  entry: entries,
  plugins: [copyCssPlugin({ skinsDir, outDir: `dist/${mode}`, inline: false, rebuild: false })],
});

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: 'vp pack',
        dependsOn: workspaceTaskDependencies(),
        input: cachedTaskInputs,
        output: ['dist/**', '!dist/registry', '!dist/registry/**'],
      },
      'build:shadcn': {
        command: 'vp -C shadcn pack',
        dependsOn: workspaceTaskDependencies(),
        // The registry plugin compares files in its output directory before
        // rewriting them; those reads must not turn outputs into inputs.
        input: [...cachedTaskInputs, '!dist/registry', '!dist/registry/**'],
        output: ['dist/registry/**'],
      },
      'test:ci': packageTestTask('pnpm run test:types && vp test run'),
    },
  },
  test: {
    projects: [
      {
        test: {
          name: 'skins',
          root: packageDir,
          include: ['vjsc/**/*.test.ts'],
          // These integration tests share Vite and Rolldown package state.
          fileParallelism: false,
        },
      },
    ],
  },
  pack: packageBuildModes.map(createPackConfig),
});
