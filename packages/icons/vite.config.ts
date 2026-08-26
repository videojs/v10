import { defineConfig } from 'vite-plus';

import { cachedTaskInputs, packageTestTask, workspaceTaskDependencies } from '../../build/task.ts';

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: 'node --import tsx scripts/build-icons.ts',
        dependsOn: workspaceTaskDependencies(),
        input: [...cachedTaskInputs, '!dist', '!dist/**'],
        output: ['dist/**'],
      },
      'test:ci': packageTestTask('pnpm run test:types && vp test run'),
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
