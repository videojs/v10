import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/tsdown.ts';

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

const createConfig = (mode: PackageBuildMode): UserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  entry: 'src/**/index.{ts,tsx}',
  noExternal: [/^@videojs\/skins/],
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  plugins: [copyCssPlugin({ skinsDir, outDir: `dist/${mode}` })],
});

export default defineConfig(packageBuildModes.map((mode) => createConfig(mode)));
