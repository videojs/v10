import { defineConfig } from 'vite-plus';

import { cachedTaskInputs, packageTestTask, workspaceTaskDependencies } from '../../build/task.ts';
import { registryTargets } from './build/registry/targets.ts';

const packageDir = import.meta.dirname;
const generatedPackageOutputs = [
  { pattern: 'packages/html/src/presets/background/skin.ts', base: 'workspace' as const },
  { pattern: 'packages/html/src/define/background/skin.css', base: 'workspace' as const },
  { pattern: 'packages/html/src/internal/skins/**', base: 'workspace' as const },
  { pattern: 'packages/react/src/internal/skins/**', base: 'workspace' as const },
  { pattern: 'packages/react/src/presets/*/skin.tsx', base: 'workspace' as const },
  { pattern: 'packages/react/src/presets/*/skin.css', base: 'workspace' as const },
  { pattern: 'packages/react/src/presets/*/minimal-skin.tsx', base: 'workspace' as const },
  { pattern: 'packages/react/src/presets/*/minimal-skin.css', base: 'workspace' as const },
] as const;

export default defineConfig({
  run: {
    tasks: {
      generate: {
        command: 'vp -C build pack',
        dependsOn: workspaceTaskDependencies(),
        untrackedEnv: ['VIDEOJS_PROFILE_SKINS'],
        // Generated package files and registry output are restored by this task,
        // so they must not participate in its own fingerprint.
        input: [
          ...cachedTaskInputs,
          // The vjsc plugin rewrites this manifest while generating.
          '!src/styles/candidates.generated.css',
          '!dist/registry',
          '!dist/registry/**',
          ...generatedPackageOutputs.map(({ pattern, base }) => ({ pattern: `!${pattern}`, base })),
        ],
        output: ['dist/registry/source/**', ...generatedPackageOutputs],
      },
      'build:shadcn': {
        command: 'node --import tsx build/registry/build.ts',
        dependsOn: ['generate'],
        input: [
          'dist/registry/source/r/**',
          'build/registry/build.ts',
          'package.json',
          { pattern: 'pnpm-lock.yaml', base: 'workspace' },
        ],
        output: ['dist/shadcn/r/**'],
      },
      'validate:shadcn:schema': {
        command: registryTargets.map(
          ({ output }) => `shadcn registry validate dist/registry/source/${output}/registry.json --cwd .`
        ),
        dependsOn: ['generate'],
        input: ['dist/registry/source/r/**', 'package.json', { pattern: 'pnpm-lock.yaml', base: 'workspace' }],
        output: [],
      },
      'validate:shadcn:policy': {
        command: 'node --import tsx build/registry/validate.ts',
        dependsOn: ['build:shadcn'],
        input: [
          'build/registry/validate.ts',
          'dist/registry/source/r/**',
          'dist/shadcn/r/**',
          { pattern: 'packages/*/package.json', base: 'workspace' },
        ],
        output: [],
      },
      'validate:shadcn': {
        command: 'node -e "" --',
        dependsOn: ['validate:shadcn:schema', 'validate:shadcn:policy'],
        output: [],
      },
      'test:ci': {
        ...packageTestTask('pnpm run test:types && vp test run'),
        dependsOn: ['generate'],
      },
    },
  },
  test: {
    projects: [
      {
        test: {
          name: 'skins',
          root: packageDir,
          include: ['build/**/*.test.ts', 'src/**/*.test.ts'],
          // These integration tests share Vite and Rolldown package state.
          fileParallelism: false,
        },
      },
    ],
  },
});
