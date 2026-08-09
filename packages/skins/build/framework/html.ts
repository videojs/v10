import type { StyleProgram } from '@videojs/compiler/tailwind';
import { format } from 'oxfmt';
import { resolveSkinClosure } from '../graph/resolve';
import type { ResolvedSkinCatalog } from '../graph/types';
import { resolveHtmlElementImports } from '../targets/html';
import { connectHtmlPopups } from './html-markup';
import { renderHtmlSkin } from './render-html';

/** Render the complete canonical Skin closure into one HTML template module. */
export async function generateHtmlSkinSource(
  catalog: ResolvedSkinCatalog,
  skin: string,
  entryFile: string,
  iconSet: string,
  program: StyleProgram
): Promise<string> {
  const output = await renderHtmlSkin(entryFile, program);
  const imports = htmlImports(catalog, skin, iconSet);
  const html = await format('skin.html', connectHtmlPopups(output), {
    printWidth: 120,
    htmlWhitespaceSensitivity: 'ignore',
  });
  if (html.errors.length > 0) throw new Error(html.errors.map((error) => error.message).join('\n'));
  return `${imports.join('\n')}\n\nexport const skin = /* html */ \`${escapeTemplate(html.code.trim())}\`;\n`;
}

function htmlImports(catalog: ResolvedSkinCatalog, skin: string, iconSet: string): string[] {
  const closure = resolveSkinClosure(catalog, skin);
  const icons = closure.symbols.icons ?? [];
  const components = closure.symbols.components ?? [];
  return [
    ...(icons.length > 0 ? [`import '${htmlIconElementImport(iconSet)}';`] : []),
    ...resolveHtmlElementImports(components).map((source) => `import '${source}';`),
  ];
}

function htmlIconElementImport(iconSet: string): string {
  return iconSet === 'default' ? '@videojs/html/icons/element' : `@videojs/html/icons/element/${iconSet}`;
}

function escapeTemplate(source: string): string {
  return source.replaceAll('`', '\\`').replaceAll('${', '\\${');
}
