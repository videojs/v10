import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { resolveImports } from './resolve-css-imports.mjs';

/**
 * @param {{ skinsDir: string; outDir: string }} options
 */
export function copyCssPlugin(options) {
  const { skinsDir, outDir } = options;

  return {
    name: 'copy-css',
    buildStart() {
      for (const file of globSync('src/**/*.css')) {
        this.addWatchFile(file);
      }
      for (const file of globSync(join(skinsDir, '**/*.css'))) {
        this.addWatchFile(file);
      }
    },
    writeBundle() {
      for (const file of globSync('src/**/*.css')) {
        const content = readFileSync(file, 'utf-8');
        const resolved = resolveImports(content, dirname(file), skinsDir);
        const outFile = join(outDir, file.replace(/^src\//, ''));
        mkdirSync(dirname(outFile), { recursive: true });
        writeFileSync(outFile, resolved);
      }
    },
  };
}
