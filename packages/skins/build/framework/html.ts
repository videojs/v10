import { build } from '@videojs/compiler';
import { format } from 'oxfmt';
import { resolveSkinClosure } from '../catalog/resolve';
import type { ResolvedSkinCatalog } from '../catalog/types';
import { createCompilerHtmlConfig, resolveHtmlElementImports } from '../compiler/html';
import type { SkinStyleManifest } from '../styles/manifest';
import type { MutableSkinStyleUsage } from '../styles/transform';

/** Render the complete canonical Skin closure into one HTML template module. */
export async function generateHtmlSkinSource(
  catalog: ResolvedSkinCatalog,
  skin: string,
  entryFile: string,
  iconSet: string,
  styles: SkinStyleManifest,
  usage: MutableSkinStyleUsage,
  resolveImport: (source: string) => string = (source) => source
): Promise<string> {
  const result = await build({
    ...createCompilerHtmlConfig({ style: 'vanilla', styles, usage }),
    input: entryFile,
    output: { file: entryFile.replace(/\.tsx$/, '.html') },
  });
  const chunks = result.files.filter((file) => file.type === 'chunk');
  if (chunks.length !== 1 || !chunks[0]) {
    throw new Error(`HTML Skin generation expected one output chunk, but received ${chunks.length}.`);
  }
  const imports = htmlImports(catalog, skin, iconSet).map(resolveImport);
  const html = await format('skin.html', chunks[0].source, {
    printWidth: 120,
    htmlWhitespaceSensitivity: 'ignore',
  });
  if (html.errors.length > 0) throw new Error(html.errors.map((error) => error.message).join('\n'));
  return `${imports.map((source) => `import '${source}';`).join('\n')}\n\nexport const skin = /* html */ \`${escapeTemplate(html.code.trim())}\`;\n`;
}

function htmlImports(catalog: ResolvedSkinCatalog, skin: string, iconSet: string): string[] {
  const closure = resolveSkinClosure(catalog, skin);
  const icons = closure.symbols.icons ?? [];
  const components = closure.symbols.components ?? [];
  return [...(icons.length > 0 ? [htmlIconElementImport(iconSet)] : []), ...resolveHtmlElementImports(components)];
}

function htmlIconElementImport(iconSet: string): string {
  return iconSet === 'default' ? '@videojs/html/icons/element' : `@videojs/html/icons/element/${iconSet}`;
}

function escapeTemplate(source: string): string {
  return source.replaceAll('`', '\\`').replaceAll('${', '\\${');
}
