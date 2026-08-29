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
      generate: {
        command: ['rimraf dist/registry', 'vp -C shadcn pack'],
        dependsOn: workspaceTaskDependencies(),
        // The registry plugin compares files in its output directory before
        // rewriting them; those reads must not turn outputs into inputs.
        input: [
          ...cachedTaskInputs,
          '!dist/registry',
          '!dist/registry/**',
          { pattern: '!packages/html/src/presets/background/skin.ts', base: 'workspace' },
          { pattern: '!packages/html/src/define/background/skin.css', base: 'workspace' },
          { pattern: '!packages/html/src/internal/skins', base: 'workspace' },
          { pattern: '!packages/html/src/internal/skins/**', base: 'workspace' },
          { pattern: '!packages/react/src/internal/skins', base: 'workspace' },
          { pattern: '!packages/react/src/internal/skins/**', base: 'workspace' },
          { pattern: '!packages/react/src/presets/*/skin.tsx', base: 'workspace' },
          { pattern: '!packages/react/src/presets/*/skin.css', base: 'workspace' },
          { pattern: '!packages/react/src/presets/*/minimal-skin.tsx', base: 'workspace' },
          { pattern: '!packages/react/src/presets/*/minimal-skin.css', base: 'workspace' },
        ],
        output: [
          'dist/registry/source/**',
          { pattern: 'packages/html/src/presets/background/skin.ts', base: 'workspace' },
          { pattern: 'packages/html/src/define/background/skin.css', base: 'workspace' },
          { pattern: 'packages/html/src/internal/skins/**', base: 'workspace' },
          { pattern: 'packages/react/src/internal/skins/**', base: 'workspace' },
          { pattern: 'packages/react/src/presets/*/skin.tsx', base: 'workspace' },
          { pattern: 'packages/react/src/presets/*/skin.css', base: 'workspace' },
          { pattern: 'packages/react/src/presets/*/minimal-skin.tsx', base: 'workspace' },
          { pattern: 'packages/react/src/presets/*/minimal-skin.css', base: 'workspace' },
        ],
      },
      'build:shadcn:react': {
        command: [
          'rimraf dist/registry/r/react',
          'shadcn build dist/registry/source/r/react/registry.json --output dist/registry/r/react',
        ],
        dependsOn: ['generate'],
        cache: false,
      },
      'build:shadcn:react-css': {
        command: [
          'rimraf dist/registry/r/react/css',
          'shadcn build dist/registry/source/r/react/css/registry.json --output dist/registry/r/react/css',
        ],
        dependsOn: ['build:shadcn:react'],
        cache: false,
      },
      'build:shadcn:html': {
        command: [
          'rimraf dist/registry/r/html',
          'shadcn build dist/registry/source/r/html/registry.json --output dist/registry/r/html',
        ],
        dependsOn: ['generate'],
        cache: false,
      },
      'build:shadcn': {
        command: [
          'rimraf dist/registry/r/html/css',
          'shadcn build dist/registry/source/r/html/css/registry.json --output dist/registry/r/html/css',
        ],
        dependsOn: ['build:shadcn:html', 'build:shadcn:react-css'],
        cache: false,
      },
      'validate:shadcn': {
        command: 'node --import tsx scripts/validate-shadcn-registry.ts',
        dependsOn: ['build:shadcn', '@videojs/react#build'],
        cache: false,
      },
      'test:ci': {
        ...packageTestTask('pnpm run test:types && vp test run'),
        dependsOn: ['build', 'validate:shadcn'],
      },
    },
  },
  test: {
    projects: [
      {
        test: {
          name: 'skins',
          root: packageDir,
          include: ['build/**/*.test.ts', 'vjsc/**/*.test.ts'],
          // These integration tests share Vite and Rolldown package state.
          fileParallelism: false,
        },
      },
    ],
  },
  pack: packageBuildModes.map(createPackConfig),
});
