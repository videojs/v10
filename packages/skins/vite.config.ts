import { globSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';
import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';

const skinsDir = resolve('src');
const entries = Object.fromEntries(
  globSync('src/**/*.tailwind.ts').map((file) => {
    const key = file.replace('src/', '').replace('.ts', '');
    return [key, file];
  })
);

const createPackConfig = (mode: PackageBuildMode): PackUserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  entry: entries,
  plugins: [copyCssPlugin({ skinsDir, outDir: `dist/${mode}`, inline: false, rebuild: false })],
});

export default defineConfig({
  test: {
    include: ['build/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
  pack: packageBuildModes.map(createPackConfig),
});
