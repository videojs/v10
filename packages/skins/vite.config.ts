import { globSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from 'vite-plus';
import type { UserConfig as PackUserConfig } from 'vite-plus/pack';

import { type PackageBuildMode, packageBuildConfig, packageBuildModes } from '../../build/pack.ts';
import { copyCssPlugin } from '../../build/plugins/copy-css-plugin.ts';

const packageDir = import.meta.dirname;
const skinsDir = resolve('src');
const entries = Object.fromEntries(
  globSync('src/**/*.tailwind.ts').map((file) => {
    const key = file.replace('src/', '').replace('.ts', '');
    return [key, file];
  })
);

const createPackConfig = (mode: PackageBuildMode): PackUserConfig => ({
  ...packageBuildConfig(mode, 'browser'),
  name: 'skins',
  entry: entries,
  plugins: [copyCssPlugin({ skinsDir, outDir: `dist/${mode}`, inline: false, rebuild: false })],
});

export default defineConfig({
  run: {
    tasks: {
      'build:shadcn': {
        command: 'vp -C shadcn pack',
        dependsOn: [{ task: 'build', from: ['dependencies', 'devDependencies'] }],
      },
    },
  },
  test: {
    projects: [
      {
        test: {
          name: 'skins',
          root: packageDir,
          include: ['vjsc/**/*.test.ts'],
        },
      },
    ],
  },
  pack: packageBuildModes.map(createPackConfig),
});
