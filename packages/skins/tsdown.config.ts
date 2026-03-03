import { globSync } from 'node:fs';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';

type BuildMode = 'dev' | 'default';

const buildModes: BuildMode[] = ['dev', 'default'];

const entries = Object.fromEntries(
  globSync('src/**/*.tailwind.ts').map((file) => {
    const key = file.replace('src/', '').replace('.ts', '');
    return [key, file];
  })
);

const createConfig = (mode: BuildMode): UserConfig => ({
  entry: entries,
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
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

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
