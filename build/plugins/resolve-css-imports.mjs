import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Resolves `@import` directives in CSS content, inlining referenced files.
 *
 * @param {string} content - The CSS content to resolve.
 * @param {string} baseDir - The directory to resolve relative imports from.
 * @param {string} skinsDir - The directory to resolve `@videojs/skins` imports from.
 * @returns {string} The resolved CSS content.
 */
export function resolveImports(content, baseDir, skinsDir) {
  return content.replace(/@import\s+['"]([^'"]+)['"]\s*;/g, (_, importPath) => {
    let file;

    if (importPath.startsWith('@videojs/skins/')) {
      file = resolve(skinsDir, importPath.replace('@videojs/skins/', ''));
    } else if (importPath.startsWith('.')) {
      file = resolve(baseDir, importPath);
    } else {
      return _;
    }

    const nested = readFileSync(file, 'utf-8');
    return resolveImports(nested, dirname(file), skinsDir);
  });
}
