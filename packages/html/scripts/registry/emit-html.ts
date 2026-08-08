import { posix } from 'node:path';
import { format } from 'prettier';
import {
  createExtractedStyleFile,
  createRegistryOutputFile,
  createStyleResourceFiles,
  type GenerateRegistryOptions,
  generateRegistry,
  type RegistryItemContext,
  type RegistryOutput,
  type RegistryOutputFile,
  type ResolvedRegistry,
  resolveRegistryClosure,
  sourceEntryName,
} from '../../../skins/registry/index.ts';
import { resolveHtmlElementImports } from '../../skins.compiler.config.ts';
import { renderSkinSourceOutput } from '../render-skins.ts';

export type GenerateHtmlRegistryOptions = GenerateRegistryOptions;

/** Emit resolved Skin registry items as HTML source. */
export function generateHtmlRegistry(
  registry: ResolvedRegistry,
  options: GenerateHtmlRegistryOptions
): Promise<RegistryOutput> {
  return generateRegistry(registry, options, {
    framework: 'html',
    outputEntryName: (entry) => sourceEntryName(entry, 'html'),
    emitItem: emitHtmlItem,
  });
}

async function emitHtmlItem(context: RegistryItemContext): Promise<RegistryOutputFile[]> {
  const rendered = await renderSkinSourceOutput(context.inputFile, {
    style: context.options.style,
    ...(context.options.style === 'css' ? { tailwindInput: context.tailwindInput } : {}),
  });
  const entrySource = await format(rendered.html, {
    parser: 'html',
    printWidth: 120,
    htmlWhitespaceSensitivity: 'ignore',
  });
  const files = await createStyleResourceFiles(context);
  if (context.options.style === 'css') files.push(createExtractedStyleFile(context, rendered.css));

  const closure = resolveRegistryClosure(context.registry, context.item.name);
  const icons = closure.symbols.icons ?? [];
  const components = closure.symbols.components ?? [];
  const imports = [
    ...(icons.length > 0 ? [`import '${htmlIconElementImport(context.options.iconSet)}';`] : []),
    ...resolveHtmlElementImports(components).map((specifier) => `import '${specifier}';`),
  ];
  if (imports.length > 0) {
    files.push(createRegistryOutputFile(posix.join(context.itemDir, 'elements.ts'), `${imports.join('\n')}\n`));
  }

  files.push(createRegistryOutputFile(context.entryFile, entrySource));
  return files;
}

function htmlIconElementImport(iconSet: string): string {
  return iconSet === 'default' ? '@videojs/html/icons/element' : `@videojs/html/icons/element/${iconSet}`;
}
