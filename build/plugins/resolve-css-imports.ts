import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** Resolves `@import` directives in CSS content, inlining referenced files. */
export function resolveImports(content: string, baseDir: string, skinsDir: string): string {
  return content.replace(/@import\s+['"]([^'"]+)['"]\s*;/g, (match, importPath: string) => {
    let file: string;

    if (importPath.startsWith('@videojs/skins/')) {
      file = resolve(skinsDir, importPath.replace('@videojs/skins/', ''));
    } else if (importPath.startsWith('.')) {
      file = resolve(baseDir, importPath);
    } else {
      return match;
    }

    const nested = readFileSync(file, 'utf-8');
    return resolveImports(nested, dirname(file), skinsDir);
  });
}
