import { globSync } from 'node:fs';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';

type BuildMode = 'dev' | 'default';

const buildModes: BuildMode[] = ['dev', 'default'];

const createConfig = (mode: BuildMode, isWatch: boolean): UserConfig => ({
  entry: 'src/**/index.ts',
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
  dts: mode === 'dev',
  copy: [
    {
      from: 'src/**/*.css',
      to: `dist/${mode}`,
      flatten: false,
    },
  ],
  plugins: [
    {
      name: 'watch-css',
      buildStart() {
        const cssFiles = globSync('src/**/*.css');
        for (const file of cssFiles) {
          this.addWatchFile(file);
        }
      },
    },
  ],
});

export default defineConfig((cliOptions) => {
  const isWatch = !!cliOptions.watch;
  return buildModes.map((mode) => createConfig(mode, isWatch));
});
