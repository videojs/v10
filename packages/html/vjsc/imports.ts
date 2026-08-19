import { posix } from 'node:path';

/** Resolve a public HTML side-effect import relative to generated package source. */
export function resolvePackageImport(specifier: string, importer: string): string {
  const target = packageModule(specifier);
  const relative = posix.relative(posix.dirname(importer), target);

  return relative.startsWith('.') ? relative : `./${relative}`;
}

function packageModule(specifier: string): string {
  if (specifier === '@videojs/html/i18n') return 'src/define/i18n';

  const uiPrefix = '@videojs/html/ui/';
  if (specifier.startsWith(uiPrefix)) return posix.join('src/define/ui', specifier.slice(uiPrefix.length));

  const mediaPrefix = '@videojs/html/media/';
  if (specifier.startsWith(mediaPrefix)) return posix.join('src/define/media', specifier.slice(mediaPrefix.length));

  const iconsPrefix = '@videojs/html/icons/element';
  if (specifier === iconsPrefix) return 'src/icons/element';
  if (specifier.startsWith(`${iconsPrefix}/`)) {
    return posix.join('src/icons/element', specifier.slice(iconsPrefix.length + 1));
  }

  throw new Error(`Cannot resolve HTML package import \`${specifier}\`.`);
}
