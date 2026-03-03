import { globSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserConfig } from 'tsdown';
import { defineConfig } from 'tsdown';

type BuildMode = 'dev' | 'default';

const buildModes: BuildMode[] = ['dev', 'default'];

const skinsDir = resolve(dirname(fileURLToPath(import.meta.url)), '../skins/src');

const createConfig = (mode: BuildMode): UserConfig => ({
  entry: 'src/**/index.{ts,tsx}',
  platform: 'browser',
  format: 'es',
  sourcemap: true,
  clean: true,
  hash: false,
  unbundle: true,
  noExternal: [/^@videojs\/skins/],
  alias: {
    '@': new URL('./src', import.meta.url).pathname,
  },
  outDir: `dist/${mode}`,
  define: {
    __DEV__: mode === 'dev' ? 'true' : 'false',
  },
  dts: mode === 'dev',
  plugins: [
    {
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
            // Resolve relative @import within the skins CSS
            skinsContent = skinsContent.replace(/@import\s+['"]\.\/([^'"]+)['"]\s*;/g, (__, relPath) =>
              readFileSync(resolve(dirname(skinsFile), relPath), 'utf-8')
            );
            return skinsContent;
          });

          const outFile = join(`dist/${mode}`, file.replace(/^src\//, ''));
          mkdirSync(dirname(outFile), { recursive: true });
          writeFileSync(outFile, content);
        }
      },
    },
  ],
});

export default defineConfig(buildModes.map((mode) => createConfig(mode)));
