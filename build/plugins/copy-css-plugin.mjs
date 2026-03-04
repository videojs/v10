import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

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
        let content = readFileSync(file, 'utf-8');

        // Resolve @import from @videojs/skins by inlining the CSS (including nested relative imports)
        content = content.replace(/@import\s+['"]@videojs\/skins\/([^'"]+)['"]\s*;/g, (_, importPath) => {
          const skinsFile = resolve(skinsDir, importPath);
          let skinsContent = readFileSync(skinsFile, 'utf-8');
          // Resolve relative @import within the skins CSS (handles both ./ and ../ paths)
          skinsContent = skinsContent.replace(/@import\s+['"](\.{1,2}\/[^'"]+)['"]\s*;/g, (__, relPath) =>
            readFileSync(resolve(dirname(skinsFile), relPath), 'utf-8')
          );
          return skinsContent;
        });

        const outFile = join(outDir, file.replace(/^src\//, ''));
        mkdirSync(dirname(outFile), { recursive: true });
        writeFileSync(outFile, content);
      }
    },
  };
}
