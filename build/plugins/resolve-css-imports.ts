import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Resolves `@import` directives in CSS content, inlining referenced files.
 *
 * `omit` drops an imported file, by resolved absolute path, instead of inlining it. It applies at every depth, so
 * excluding a leaf removes it from every sheet that transitively pulls it in.
 */
export function resolveImports(
  content: string,
  baseDir: string,
  skinsDir: string,
  omit?: (file: string) => boolean
): string {
  return content.replace(/@import\s+['"]([^'"]+)['"]\s*;/g, (match, importPath: string) => {
    let file: string;

    if (importPath.startsWith('@videojs/skins/')) {
      file = resolve(skinsDir, importPath.replace('@videojs/skins/', ''));
    } else if (importPath.startsWith('.')) {
      file = resolve(baseDir, importPath);
    } else {
      return match;
    }

    if (omit?.(file)) return '';

    const nested = readFileSync(file, 'utf-8');

    return resolveImports(nested, dirname(file), skinsDir, omit);
  });
}
