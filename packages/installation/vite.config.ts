import { defineConfig } from 'vite-plus';

import { neutralLibraryConfig } from '../../build/pack.ts';
import { cachedTaskInputs, packageTestTask, workspaceTaskDependencies } from '../../build/task.ts';

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
  test: {
    include: ['src/**/*.test.ts'],
  },
  pack: {
    ...neutralLibraryConfig,
    entry: {
      index: './src/index.ts',
      node: './src/node.ts',
    },
  },
});
