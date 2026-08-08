import { posix } from 'node:path';
import { type ArtifactGraph, resolveArtifactClosure } from '@videojs/compiler/artifacts';
import { format } from 'prettier';
import {
  type CreateFrameworkSourceOutputOptions,
  createExtractedStyleFile,
  createFrameworkSourceOutput,
  createSourceOutputFile,
  createStyleResourceFiles,
  type SourceArtifactContext,
  type SourceOutputFile,
  type SourceOutputManifest,
  sourceEntryName,
} from '../../../skins/scripts/source-presets/output.ts';
import { resolveHtmlElementImports } from '../../skins.compiler.config.ts';
import { renderSkinSourceOutput } from '../render-skins.ts';

export type CreateHtmlSourceOutputOptions = CreateFrameworkSourceOutputOptions;

/** Emit canonical Skin artifacts as HTML source. */
export function createHtmlSourceOutput(
  graph: ArtifactGraph,
  options: CreateHtmlSourceOutputOptions
): Promise<SourceOutputManifest> {
  return createFrameworkSourceOutput(graph, options, {
    framework: 'html',
    outputEntryName: (entry) => sourceEntryName(entry, 'html'),
    emitArtifact: emitHtmlArtifact,
  });
}

async function emitHtmlArtifact(context: SourceArtifactContext): Promise<SourceOutputFile[]> {
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

  const closure = resolveArtifactClosure(context.graph, context.artifact.id);
  const icons = closure.symbols.icons ?? [];
  const components = closure.symbols.components ?? [];
  const imports = [
    ...(icons.length > 0 ? [`import '${htmlIconElementImport(context.options.iconSet)}';`] : []),
    ...resolveHtmlElementImports(components).map((specifier) => `import '${specifier}';`),
  ];
  if (imports.length > 0) {
    files.push(
      createSourceOutputFile(context.options, posix.join(context.artifactDir, 'elements.ts'), `${imports.join('\n')}\n`)
    );
  }

  files.push(createSourceOutputFile(context.options, context.entryFile, entrySource));
  return files;
}

function htmlIconElementImport(iconSet: string): string {
  return iconSet === 'default' ? '@videojs/html/icons/element' : `@videojs/html/icons/element/${iconSet}`;
}
