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
      'prepare:shadcn': {
        command: ['rimraf dist/registry', 'vp -C shadcn pack'],
        dependsOn: workspaceTaskDependencies(),
        // The registry plugin compares files in its output directory before
        // rewriting them; those reads must not turn outputs into inputs.
        input: [...cachedTaskInputs, '!dist/registry', '!dist/registry/**'],
        output: ['dist/registry/source/**'],
      },
      'build:shadcn:react': {
        command: 'shadcn build dist/registry/source/r/react/registry.json --output dist/registry/r/react',
        dependsOn: ['prepare:shadcn'],
        input: ['dist/registry/source/r/react/**', '!dist/registry/source/r/react/css/**'],
        output: ['dist/registry/r/react/**', '!dist/registry/r/react/css/**'],
      },
      'build:shadcn:react-css': {
        command: 'shadcn build dist/registry/source/r/react/css/registry.json --output dist/registry/r/react/css',
        dependsOn: ['build:shadcn:react'],
        input: ['dist/registry/source/r/react/css/**'],
        output: ['dist/registry/r/react/css/**'],
      },
      'build:shadcn:html': {
        command: 'shadcn build dist/registry/source/r/html/registry.json --output dist/registry/r/html',
        dependsOn: ['prepare:shadcn'],
        input: ['dist/registry/source/r/html/**', '!dist/registry/source/r/html/css/**'],
        output: ['dist/registry/r/html/**', '!dist/registry/r/html/css/**'],
      },
      'build:shadcn': {
        command: 'shadcn build dist/registry/source/r/html/css/registry.json --output dist/registry/r/html/css',
        dependsOn: ['build:shadcn:html', 'build:shadcn:react-css'],
        input: ['dist/registry/source/r/html/css/**'],
        output: ['dist/registry/r/html/css/**'],
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
