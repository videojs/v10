import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { isDevBuildMode, type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { cachedTaskInputs, packageTestTask, workspaceTaskDependencies } from '../../build/task.ts';

const createPackConfig = (mode: PackageBuildMode): PackUserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  entry: {
    index: './src/index.ts',
    'errors/index': './src/errors/index.ts',
  },
  plugins: isDevBuildMode(mode)
    ? []
    : [
        // The Video.js 8 stylesheet path, served once from the package root.
        copyCssPlugin({
          outDir: 'dist',
          pattern: 'src/legacy/video-js.css',
          inline: false,
          rename: () => 'video-js.css',
        }),
      ],
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
  resolve: {
    // Same reason as `@videojs/html`: Vitest transforms through the SSR pipeline, where `browser` is not a resolve
    // condition, and `@videojs/media` answers `browser` separately for medias whose engine has a server build.
    conditions: ['browser', 'development', 'module', 'import', 'default'],
  },
  test: {
    // The root entry registers `@videojs/html` custom elements, which need a DOM to load.
    environment: 'happy-dom',
    onConsoleLog: (log) => !log.includes('Lit is in dev mode'),
  },
  pack: packageBuildModes.map(createPackConfig),
});
