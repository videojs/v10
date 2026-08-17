import { build } from '@videojs/compiler';
import { format } from 'oxfmt';
import { resolveSkinClosure } from '../catalog/resolve';
import type { ResolvedSkinCatalog } from '../catalog/types';
import { createCompilerHtmlConfig, resolveHtmlElementImports } from '../compiler/html';
import { skinRootClassName } from '../compiler/skin-root';
import type { SkinStyleManifest } from '../styles/manifest';

interface GenerateHtmlSkinOptions {
  skin: string;
  entryFile: string;
  iconSet: string;
  styles: SkinStyleManifest;
  resolveImport?: ((specifier: string) => string) | undefined;
}

/** Render the complete canonical Skin closure into one HTML template module. */
export async function generateHtmlSkin(
  catalog: ResolvedSkinCatalog,
  options: GenerateHtmlSkinOptions
): Promise<string> {
  const skin = catalog.items.find((item) => item.name === options.skin);
  if (skin?.type !== 'skin') throw new Error(`Skin \`${options.skin}\` does not exist.`);
  const result = await build({
    ...createCompilerHtmlConfig({
      style: 'vanilla',
      styles: options.styles,
      rootClassName: skinRootClassName(skin),
    }),
    input: options.entryFile,
    output: { file: options.entryFile.replace(/\.tsx$/, '.html') },
  });
  const chunks = result.files.filter((file) => file.type === 'chunk');
  if (chunks.length !== 1 || !chunks[0]) {
    throw new Error(`HTML Skin generation expected one output chunk, but received ${chunks.length}.`);
  }
  const html = await format('skin.html', chunks[0].source, {
    printWidth: 120,
    htmlWhitespaceSensitivity: 'ignore',
  });
  if (html.errors.length > 0) throw new Error(html.errors.map((error) => error.message).join('\n'));
  const imports = htmlImports(catalog, options.skin, options.iconSet, html.code).map(
    options.resolveImport ?? ((specifier) => specifier)
  );
  return `${imports.map((specifier) => `import '${specifier}';`).join('\n')}\n\nexport const skin = /* html */ \`${escapeTemplate(html.code.trim())}\`;\n`;
}

function htmlImports(catalog: ResolvedSkinCatalog, skin: string, iconSet: string, markup: string): string[] {
  const closure = resolveSkinClosure(catalog, skin);
  const icons = closure.symbols.icons;
  const components = closure.symbols.components;
  return [
    ...(icons.length > 0 ? [htmlIconElementImport(iconSet)] : []),
    ...resolveHtmlElementImports(components, markup),
  ];
}

function htmlIconElementImport(iconSet: string): string {
  return iconSet === 'default' ? '@videojs/html/icons/element' : `@videojs/html/icons/element/${iconSet}`;
}

function escapeTemplate(content: string): string {
  return content.replaceAll('`', '\\`').replaceAll('${', '\\${');
}
