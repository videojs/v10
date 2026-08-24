import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: 'node --import tsx scripts/build-icons.ts',
        dependsOn: [{ task: 'build', from: ['dependencies', 'devDependencies'] }],
        input: [{ auto: true }, '!*.tsbuildinfo', '!**/*.tsbuildinfo', '!dist', '!dist/**'],
      },
    },
  },
  test: {
    environment: 'happy-dom',
  },
});
