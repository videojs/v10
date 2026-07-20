import { globSync } from 'node:fs';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';

const entries = Object.fromEntries(
  globSync('src/**/*.tailwind.ts').map((file) => {
    const key = file.replace('src/', '').replace('.ts', '');
    return [key, file];
  })
);

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  entry: entries,
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

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
