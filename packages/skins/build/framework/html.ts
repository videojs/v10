import type { StyleProgram } from '@videojs/compiler/tailwind';
import { format } from 'oxfmt';
import { resolveSkinClosure } from '../graph/resolve';
import type { ResolvedSkinManifest } from '../graph/types';
import { resolveHtmlElementImports } from '../targets/html';
import { connectHtmlPopups } from './html-markup';
import { renderSkinSourceOutput } from './render-html';

/** Render the complete canonical Skin closure into one HTML template module. */
export async function generateHtmlSkinSource(
  manifest: ResolvedSkinManifest,
  skin: string,
  entryFile: string,
  iconSet: string,
  program: StyleProgram
): Promise<string> {
  const output = await renderSkinSourceOutput(entryFile, { style: 'css', styleProgram: program });
  const imports = htmlImports(manifest, skin, iconSet);
  const html = await format('skin.html', connectHtmlPopups(output.html), {
    printWidth: 120,
    htmlWhitespaceSensitivity: 'ignore',
  });
  if (html.errors.length > 0) throw new Error(html.errors.map((error) => error.message).join('\n'));
  return `${imports.join('\n')}\n\nexport const skin = /* html */ \`${escapeTemplate(html.code.trim())}\`;\n`;
}

function htmlImports(manifest: ResolvedSkinManifest, skin: string, iconSet: string): string[] {
  const closure = resolveSkinClosure(manifest, skin);
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
