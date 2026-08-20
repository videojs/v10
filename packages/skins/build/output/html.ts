import { format } from 'oxfmt';
import { html } from 'vjsc';
import { defineCatalogOutput, emitCatalog } from 'vjsc/catalog';
import { getCatalogSkin, type SkinCatalog, type SkinCatalogSkin } from '../catalog';
import { createHtmlComponentRegistry } from '../metadata';
import { packageSkinStyles, skinStyleTransform } from './styles';

interface HtmlOutputOptions {
  iconSet?: string | undefined;
}

type HTMLImportResolver = (reference: string) => string;

interface EmitHtmlSkinOptions extends HtmlOutputOptions {
  skin: SkinCatalogSkin['name'];
  resolveImport?: HTMLImportResolver | undefined;
  style?: 'tailwind' | 'vanilla' | undefined;
}

/** Create the bundled HTML output adapter for a Skin catalog. */
export function htmlOutput(options: HtmlOutputOptions = {}) {
  return defineCatalogOutput({
    mode: 'bundle',
    componentRegistry: createHtmlComponentRegistry(options.iconSet ?? 'default'),
    compiler: {
      external: (source) => source.startsWith('@videojs/html/'),
      target: html(),
    },
  });
}

/** Emit one canonical Skin as a bundled HTML template module and vanilla CSS. */
export async function emitHtmlSkin(catalog: SkinCatalog, options: EmitHtmlSkinOptions) {
  const { resolveImport, skin: skinName, style = 'vanilla', ...outputOptions } = options;
  const skin = getCatalogSkin(catalog, skinName);
  const output = await emitCatalog(catalog, {
    items: [skin.name],
    output: htmlOutput(outputOptions),
    styles:
      style === 'tailwind' ? { mode: 'tailwind', variant: skin.style.variant } : skinStyleTransform(catalog, skin),
    files: {
      source: () => 'skin.html',
    },
  });
  const bundled = output.files.source[0];

  if (output.files.source.length !== 1 || !bundled) {
    throw new Error(`HTML Skin generation expected one output file, but received ${output.files.source.length}.`);
  }

  const html = await format('skin.html', bundled.content, {
    printWidth: 120,
    htmlWhitespaceSensitivity: 'ignore',
  });

  if (html.errors.length > 0) throw new Error(html.errors.map((error) => error.message).join('\n'));

  const imports = [...new Set(bundled.imports ?? [])].map(resolveImport ?? ((specifier) => specifier));
  const content = `${imports.map((specifier) => `import '${specifier}';`).join('\n')}\n\nexport const skin = /* html */ \`${escapeTemplate(html.code.trim())}\`;\n`;

  return {
    files: [{ path: 'skin.ts', content }],
    styles: style === 'vanilla' ? await packageSkinStyles(catalog, skin, output.files.style) : [],
  };
}

function escapeTemplate(content: string): string {
  return content.replaceAll('`', '\\`').replaceAll('${', '\\${');
}
