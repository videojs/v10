import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { resolveImports } from './resolve-css-imports.mjs';

const INLINE_PREFIX = 'inline-css:';

const INLINE_SUFFIX = '?inline';

/**
 * Rolldown/tsdown plugin that inlines `.css?inline` imports as JavaScript
 * modules exporting the resolved CSS string. Mirrors the Vite `?inline`
 * convention so the same source works in both Vite dev and tsdown builds.
 *
 * @param {{ skinsDir: string; rootDir?: string }} options
 */
export function inlineCssPlugin(options) {
  const { skinsDir, rootDir = process.cwd() } = options;

  return {
    name: 'inline-css',

    resolveId(source, importer) {
      if (!source.endsWith(INLINE_SUFFIX)) return null;

      const cssPath = source.slice(0, -INLINE_SUFFIX.length);
      const abs = resolve(dirname(importer), cssPath);
      const rel = relative(rootDir, abs);

      // Use .js extension so rolldown doesn't apply its CSS loader.
      return { id: `${INLINE_PREFIX}${rel.replace(/\.css$/, '.js')}`, moduleSideEffects: false };
    },

    load(id) {
      if (!id.startsWith(INLINE_PREFIX)) return null;

      // Map back to the .css file path.
      const rel = id.slice(INLINE_PREFIX.length).replace(/\.js$/, '.css');
      const file = resolve(rootDir, rel);
      const raw = readFileSync(file, 'utf-8');
      const resolved = resolveImports(raw, dirname(file), skinsDir);

      return { code: `export default ${JSON.stringify(resolved)};`, moduleSideEffects: false };
    },
  };
}
