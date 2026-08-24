import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';
import { playwright } from 'vite-plus/test/browser-playwright';

import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';
import { cachedTaskInputs } from '../../build/run.ts';

const createPackConfig = (mode: PackageBuildMode): PackUserConfig => ({
  ...packageBuildConfig(mode, 'neutral'),
  entry: {
    index: 'src/index.ts',
    dom: 'src/dom.ts',
    hls: 'src/playback/engines/hls/index.ts',
    'media-tracks': 'src/media/media-tracks/index.ts',
    'hls-audio': 'src/playback/adapters/hls-audio/index.ts',
    'hls-background-video': 'src/playback/adapters/hls-background-video/index.ts',
    'hls-video': 'src/playback/adapters/hls-video/index.ts',
    'mux-audio': 'src/playback/adapters/mux-audio/index.ts',
    'mux-background-video': 'src/playback/adapters/mux-background-video/index.ts',
    'mux-video': 'src/playback/adapters/mux-video/index.ts',
  },
});

export default defineConfig({
  run: {
    tasks: {
      build: {
        command: 'vp pack',
        dependsOn: [{ task: 'build', from: ['dependencies', 'devDependencies'] }],
        input: cachedTaskInputs,
      },
    },
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          include: ['src/core/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'media',
          include: ['src/media/**/*.test.ts'],
          exclude: ['src/media/dom/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'network',
          include: ['src/network/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'behaviors',
          include: [
            'src/playback/behaviors/**/*.test.ts',
            'src/playback/actors/**/*.test.ts',
            'src/playback/primitives/**/*.test.ts',
          ],
          exclude: ['src/playback/behaviors/dom/**', 'src/playback/actors/dom/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          // All DOM-bound tests across the package — MSE/VTT primitives,
          // DOM-bound behaviors, DOM-bound actor factories.
          include: [
            'src/media/dom/**/*.test.ts',
            'src/playback/behaviors/dom/**/*.test.ts',
            'src/playback/actors/dom/**/*.test.ts',
          ],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            screenshotFailures: false,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'playback-engines',
          include: ['src/playback/engines/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            screenshotFailures: false,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        test: {
          // The Medias over the engines. Browser-bound like the engines they
          // drive: they construct a real composition, which reaches MediaSource.
          name: 'playback-adapters',
          include: ['src/playback/adapters/**/*.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            screenshotFailures: false,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'types',
          include: [],
          typecheck: {
            enabled: true,
            checker: 'tsgo',
            include: ['src/**/*.test-d.ts'],
          },
        },
      },
    ],
  },
  pack: packageBuildModes.map(createPackConfig),
});
