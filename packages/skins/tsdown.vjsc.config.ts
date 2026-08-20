import { globSync } from 'node:fs';
import { resolve } from 'node:path';

import { defineConfig } from 'tsdown';
import { shadcnPlugin, vjscPlugin } from 'vjsc/rolldown';

import { baseConfig } from '../../build/tsdown.ts';
import { skinRegistry } from './vjsc/registry/shadcn';
import { createSkinCompilerConfig } from './vjsc/transform';

const packageDir = import.meta.dirname;
const vjscDir = resolve(packageDir, 'vjsc');
const registryUtils = resolve(vjscDir, 'registry/utils.ts');
const sourceFiles = ['./components/**/*.{ts,tsx}', './skins/*/skin.{ts,tsx}']
  .flatMap((pattern) => globSync(pattern, { cwd: vjscDir }))
  .sort();
const entries = Object.fromEntries(
  sourceFiles.map((fileName) => [fileName.replace(/\.[^.]+$/, ''), resolve(vjscDir, fileName)])
);
const sourceFilter = new RegExp(`^${escapeRegExp(vjscDir)}/.*\\.[cm]?[jt]sx?$`);

export default defineConfig({
  ...baseConfig,
  name: 'skins-shadcn-registry',
  cwd: packageDir,
  entry: entries,
  outDir: 'dist/registry',
  clean: true,
  dts: false,
  sourcemap: false,
  platform: 'browser',
  format: 'es',
  alias: {
    '@videojs/skins/registry': registryUtils,
    '@videojs/utils/style': registryUtils,
  },
  deps: {
    neverBundle: true,
    alwaysBundle: ['@videojs/skins/registry', '@videojs/utils/style'],
    onlyBundle: false,
  },
  plugins: [
    vjscPlugin({
      cwd: packageDir,
      include: sourceFilter,
      transform: createSkinCompilerConfig({ framework: 'react', skin: 'default-video', style: 'tailwind' }),
    }),
    shadcnPlugin({ root: vjscDir, registry: skinRegistry }),
  ],
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
