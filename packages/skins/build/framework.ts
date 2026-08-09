import { readFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, resolve } from 'node:path';
import { compile } from '@videojs/compiler';
import {
  createStyleProgram,
  type DesignSystem,
  loadDesignSystem,
  type StyleEmitResult,
  type StyleProgram,
} from '@videojs/compiler/tailwind';
import { format } from 'oxfmt';
import { type OutputChunk, type Plugin, rolldown } from 'rolldown';
import { resolveHtmlElementImports } from './compiler/html';
import { createReactSkinSourceConfig } from './compiler/react';
import { connectHtmlPopups } from './html-markup';
import { renderSkinSourceOutput } from './render-html';
import { resolveSkinClosure } from './resolve';
import type { ResolvedSkinItem, ResolvedSkinManifest } from './types';

export type SkinFramework = 'html' | 'react';

export interface FrameworkSkinFiles {
  sourceFile: 'skin.ts' | 'skin.tsx';
  source: string;
  styles: readonly FrameworkStyleFile[];
}

export interface FrameworkStyleFile {
  fileName: string;
  source: string;
}

export interface CreateFrameworkSkinOptions {
  framework: SkinFramework;
  rootDir: string;
  skin: string;
  iconSet?: string | undefined;
}

/** Create the compact, vanilla-CSS Skin projection consumed by a framework package. */
export async function createFrameworkSkin(
  manifest: ResolvedSkinManifest,
  options: CreateFrameworkSkinOptions
): Promise<FrameworkSkinFiles> {
  const skin = findSkin(manifest, options.skin);
  const entryFile = resolve(options.rootDir, skin.source);
  const tailwindInput = resolve(options.rootDir, requiredStyleResource(skin, 'tailwind.css'));
  const design = await loadDesignSystem(tailwindInput);
  const program = createFrameworkStyleProgram(design);

  if (options.framework === 'html') {
    const output = await renderSkinSourceOutput(entryFile, { style: 'css', styleProgram: program });
    const imports = htmlImports(manifest, skin.name, options.iconSet ?? 'default');
    const html = await format('skin.html', connectHtmlPopups(output.html), {
      printWidth: 120,
      htmlWhitespaceSensitivity: 'ignore',
    });
    assertFormatted(html);
    return {
      sourceFile: 'skin.ts',
      source: `${imports.join('\n')}\n\nexport const skin = /* html */ \`${escapeTemplate(html.code.trim())}\`;\n`,
      styles: await createFrameworkStyles(skin, options.rootDir, design, await program.emit()),
    };
  }

  const source = await bundleReactSkin(entryFile, options.iconSet ?? 'default', program);
  const emitted = await program.emit();
  return {
    sourceFile: 'skin.tsx',
    source: `// @ts-nocheck -- temporary bundled output; authored types remain in packages/skins/canonical.\n${source}`,
    styles: await createFrameworkStyles(skin, options.rootDir, design, emitted),
  };
}

function createFrameworkStyleProgram(design: DesignSystem): StyleProgram {
  return createStyleProgram({
    design,
    output: 'styles.css',
    mode: 'split',
    tailwindVariables: 'inline',
    themeSelector: '.media-skin',
  });
}

async function bundleReactSkin(entryFile: string, iconSet: string, program: StyleProgram): Promise<string> {
  const bundle = await rolldown({
    input: entryFile,
    platform: 'neutral',
    external: (id) => isBareModule(id),
    plugins: [canonicalReactPlugin(iconSet, program)],
    transform: { jsx: 'preserve' },
    experimental: { attachDebugInfo: 'none' },
  });
  const output = await bundle.generate({ format: 'esm', comments: false }).finally(() => bundle.close());
  const chunks = output.output.filter((item): item is OutputChunk => item.type === 'chunk');
  if (chunks.length !== 1)
    throw new Error(`React Skin generation expected one output chunk, but received ${chunks.length}.`);
  const source = chunks[0]?.code;
  if (!source) throw new Error(`React Skin generation produced no output for \`${entryFile}\`.`);
  return source;
}

function canonicalReactPlugin(iconSet: string, program: StyleProgram): Plugin {
  return {
    name: 'videojs-skins-react',
    async load(id) {
      if (!id.endsWith('.tsx')) return null;
      const source = await readFile(id, 'utf8');
      const result = await compile(source, {
        filename: id,
        config: createReactSkinSourceConfig({ style: 'css', iconSet, styleProgram: program }),
        configDir: dirname(id),
      });
      const errors = result.diagnostics.filter((diagnostic) => diagnostic.level === 'error');
      if (errors.length > 0) throw new Error(errors.map((diagnostic) => diagnostic.message).join('\n'));
      if (result.assets.length > 0) {
        throw new Error(`React Skin module \`${id}\` emitted CSS before the shared StyleProgram.`);
      }
      return { code: result.code, moduleType: 'tsx' };
    },
  };
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

async function createFrameworkStyles(
  item: ResolvedSkinItem,
  rootDir: string,
  design: DesignSystem,
  emitted: StyleEmitResult
): Promise<FrameworkStyleFile[]> {
  const chunks = emitted.files.filter((file) => file.kind === 'chunk');
  const index = emitted.files.find((file) => file.kind === 'index');
  if (!index || chunks.length === 0 || emitted.files.some((file) => file.kind !== 'index' && file.kind !== 'chunk')) {
    throw new Error('Framework Skin generation expected one split CSS index and named role chunks.');
  }
  const expectedIndex = chunks.map((file) => `@import "./${basename(file.fileName)}";`).join('\n');
  if (normalizeCssImports(index.source) !== normalizeCssImports(expectedIndex)) {
    throw new Error('Framework Skin split CSS index unexpectedly contains global support styles.');
  }

  const resources = item.resources.styles ?? [];
  const basePath = resources.find((path) => path.endsWith('/base.css'));
  const themePath = resources.find((path) => path.endsWith('/themes/default.css'));
  if (!basePath || !themePath) throw new Error(`Skin item \`${item.name}\` is missing base or default theme CSS.`);

  const roleFiles = chunks
    .map((file) => ({ fileName: basename(file.fileName), source: file.source }))
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
  const files: FrameworkStyleFile[] = [
    { fileName: 'styles/preflight.css', source: await design.compilePreflight('.media-skin') },
    { fileName: 'styles/base.css', source: await readFile(resolve(rootDir, basePath), 'utf8') },
    { fileName: 'styles/theme.css', source: await readFile(resolve(rootDir, themePath), 'utf8') },
    ...roleFiles.map((file) => ({ ...file, fileName: `styles/${file.fileName}` })),
  ];
  return [
    {
      fileName: 'styles/styles.css',
      source: files.map((file) => `@import './${basename(file.fileName)}';`).join('\n'),
    },
    ...files,
  ];
}

function requiredStyleResource(item: ResolvedSkinItem, suffix: string): string {
  const resource = item.resources.styles?.find((path) => path.endsWith(`/${suffix}`));
  if (!resource) throw new Error(`Skin item \`${item.name}\` has no \`${suffix}\` style resource.`);
  return resource;
}

function findSkin(manifest: ResolvedSkinManifest, name: string): ResolvedSkinItem {
  const item = manifest.items.find((candidate) => candidate.name === name && candidate.type === 'skin');
  if (!item) throw new Error(`Skin \`${name}\` does not exist.`);
  return item;
}

function normalizeCssImports(source: string): string {
  return source.replaceAll("'", '"').replace(/\s+/g, ' ').trim();
}

function assertFormatted(result: Awaited<ReturnType<typeof format>>): void {
  if (result.errors.length > 0) throw new Error(result.errors.map((error) => error.message).join('\n'));
}

function isBareModule(id: string): boolean {
  return !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('\0');
}

function escapeTemplate(source: string): string {
  return source.replaceAll('`', '\\`').replaceAll('${', '\\${');
}
