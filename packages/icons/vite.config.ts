import { defineConfig } from 'vite-plus';

import { cachedTaskInputs } from '../../build/run.ts';

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: 'node --import tsx scripts/build-icons.ts',
        dependsOn: [{ task: 'build', from: ['dependencies', 'devDependencies'] }],
        input: [...cachedTaskInputs, '!dist', '!dist/**'],
      },
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
