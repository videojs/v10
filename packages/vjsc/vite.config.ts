import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { neutralLibraryConfig } from '../../build/pack.ts';
import { cachedTaskInputs, packageTestTask, workspaceTaskDependencies } from '../../build/task.ts';

const pack: PackUserConfig = {
  ...neutralLibraryConfig,
  dts: true,
  entry: {
    index: './src/index.ts',
    'ast/index': './src/ast/index.ts',
    'components/index': './src/components/index.ts',
    'components/jsx-runtime': './src/components/jsx-runtime.ts',
    'components/jsx-dev-runtime': './src/components/jsx-dev-runtime.ts',
    'target/index': './src/target/index.ts',
    'target/jsx-runtime': './src/target/jsx-runtime.ts',
    'target/jsx-dev-runtime': './src/target/jsx-dev-runtime.ts',
    'shadcn/index': './src/shadcn/index.ts',
    'styles/index': './src/styles/index.ts',
    'plugins/index': './src/plugins/index.ts',
    'vite/index': './src/vite/index.ts',
  },
  deps: { neverBundle: [/^node:/] },
};

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: 'vp pack && node scripts/check-exports.mjs',
        dependsOn: workspaceTaskDependencies(),
        input: cachedTaskInputs,
        output: ['dist/**'],
      },
      'test:ci': packageTestTask(),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
  pack,
});
