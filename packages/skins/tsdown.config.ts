import { globSync } from 'node:fs';
import { resolve } from 'node:path';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';

const skinsDir = resolve('src');

const entries = Object.fromEntries(
  globSync('src/**/*.tailwind.ts').map((file) => {
    const key = file.replace('src/', '').replace('.ts', '');
    return [key, file];
  })
);

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  entry: entries,
  plugins: [copyCssPlugin({ skinsDir, outDir: `dist/${mode}`, inline: false, rebuild: false })],
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
