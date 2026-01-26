import { existsSync, readdirSync } from 'node:fs';
import { defineConfig } from 'tsdown';
import buildStyles from './build/build-styles.ts';

const GENERATED_ICONS_DIR = new URL('./src/icons/generated-icons', import.meta.url).pathname;

function hasGeneratedIcons(): boolean {
  if (!existsSync(GENERATED_ICONS_DIR)) return false;
  const files = readdirSync(GENERATED_ICONS_DIR);
  return files.some((f) => f.endsWith('.tsx'));
}

export default defineConfig({
  entry: {
    index: './src/index.ts',
    store: './src/store/index.ts',
    icons: './src/icons/index.ts',
    'skins/frosted': './src/skins/frosted/index.ts',
    'skins/minimal': './src/skins/minimal/index.ts',
  },
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  dts: {
    oxc: true,
  },
  hooks: {
    'build:prepare': async () => {
      // Generated icons are committed to git due to @svgr/cli having a bug where it
      // unconditionally requires 'prettier' at module load time (before parsing CLI args),
      // which fails in pnpm's strict dependency isolation. Skip generation if icons exist.
      // To regenerate: pnpm -F @videojs/react-preview generate:icons
      if (hasGeneratedIcons()) return;
      throw new Error(
        'Generated icons not found. Run: pnpm -F @videojs/react-preview generate:icons',
      );
    },
    'build:done': async () => {
      await buildStyles();
    },
  },
  loader: {
    '.svg': 'text',
  },
});
