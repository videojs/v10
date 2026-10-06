import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { isDevBuildMode, type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { cachedTaskInputs, packageTestTask, workspaceTaskDependencies } from '../../build/task.ts';
import { cdnRedirectsPlugin } from './scripts/cdn-redirects-plugin.ts';

const createPackConfig = (mode: PackageBuildMode): PackUserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  entry: {
    index: './src/index.ts',
    'errors/index': './src/errors/index.ts',
  },
  plugins: isDevBuildMode(mode)
    ? []
    : [
        // Bundlers resolve the Video.js 8 stylesheet import here through `exports`.
        copyCssPlugin({
          outDir: 'dist',
          pattern: 'src/legacy/empty.css',
          inline: false,
          rename: () => 'empty.css',
        }),
        // CDNs serve files by path, so the Video.js 8 paths, `dist/video-js.css` included, redirect to video.js@8.
        cdnRedirectsPlugin({ outDir: 'dist', template: 'src/legacy/cdn-redirect.js' }),
      ],
});

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: 'vp pack',
        dependsOn: workspaceTaskDependencies(),
        cache: {
          input: cachedTaskInputs,
          output: ['dist/**'],
        },
      },
      'test:ci': packageTestTask(),
    },
  },
  define: {
    __DEV__: 'true',
  },
  test: {
    // Vitest v4 compatibility: preserve mock call history.
    // Remove after tests no longer rely on calls from setup or earlier tests.
    // https://viteplus.dev/guide/vitest-v5#remove-unneeded-compatibility-settings
    // https://vitest.dev/guide/migration/#clearmocks-is-enabled-by-default
    clearMocks: false,
    // The stub tests call `videojs()` with a `<video>` element, as v8 snippets do.
    environment: 'happy-dom',
  },
  pack: packageBuildModes.map(createPackConfig),
});
