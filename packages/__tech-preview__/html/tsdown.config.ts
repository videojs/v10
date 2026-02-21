import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'tsdown';

const defineDir = fileURLToPath(new URL('./src/define', import.meta.url));
const defineFiles = readdirSync(defineDir).filter(file => file.endsWith('.ts'));

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    store: 'src/store/index.ts',
    icons: 'src/icons/index.ts',
    'skins/frosted': 'src/skins/frosted/index.ts',
    'skins/minimal': 'src/skins/minimal/index.ts',
    ...defineFiles.reduce((entries, file) => {
      const name = file.replace(/\.ts$/, '');
      entries[`define/${name}`] = `src/define/${file}`;
      return entries;
    }, {} as Record<string, string>),
  },
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  alias: {
    '@': fileURLToPath(new URL('./src', import.meta.url)),
  },
  dts: {
    oxc: true,
  },
  loader: {
    '.svg': 'text',
    '.css': 'text',
  },
});
