import { readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { transform } from 'lightningcss';
import { resolveImports } from './resolve-css-imports.ts';
import type { BuildPlugin } from './types.ts';

const INLINE_PREFIX = 'inline-css:';

const INLINE_SUFFIX = '?inline';

interface InlineCssPluginOptions {
  skinsDir: string;
  rootDir?: string;
  minify?: boolean;
}

/**
 * Rolldown/tsdown plugin that inlines `.css?inline` imports as JavaScript
 * modules exporting the resolved CSS string. Mirrors the Vite `?inline`
 * convention so the same source works in both Vite dev and tsdown builds.
 */
export function inlineCssPlugin(options: InlineCssPluginOptions): BuildPlugin {
  const { skinsDir, rootDir = process.cwd(), minify = true } = options;

  return {
    name: 'inline-css',

    resolveId(source, importer) {
      if (!source.endsWith(INLINE_SUFFIX)) return null;

      const cssPath = source.slice(0, -INLINE_SUFFIX.length);
      const abs = resolve(dirname(importer!), cssPath);
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
      let resolved = resolveImports(raw, dirname(file), skinsDir);

      if (minify) {
        const { code } = transform({
          filename: file,
          code: Buffer.from(resolved),
          minify: true,
        });

        resolved = code.toString();
      }

      return { code: `export default ${JSON.stringify(resolved)};`, moduleSideEffects: false };
    },
  };
}
