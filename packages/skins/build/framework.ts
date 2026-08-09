import { readFile } from 'node:fs/promises';
import { basename, dirname, isAbsolute, resolve } from 'node:path';
import { compile } from '@videojs/compiler';
import { createStyleProgram, loadDesignSystem, type StyleProgram } from '@videojs/compiler/tailwind';
import { format } from 'prettier';
import { type OutputChunk, type Plugin, rolldown } from 'rolldown';
import { resolveHtmlElementImports } from './compiler/html';
import { createReactSkinSourceConfig } from './compiler/react';
import { renderSkinSourceOutput } from './render-html';
import { resolveSkinClosure } from './resolve';
import type { ResolvedSkinItem, ResolvedSkinManifest } from './types';

export type SkinFramework = 'html' | 'react';

export interface FrameworkSkinFiles {
  sourceFile: 'skin.ts' | 'skin.tsx';
  source: string;
  styles: string;
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
  const sharedStyles = await loadSharedStyles(skin, options.rootDir);

  if (options.framework === 'html') {
    const output = await renderSkinSourceOutput(entryFile, { style: 'css', tailwindInput });
    const imports = htmlImports(manifest, skin.name, options.iconSet ?? 'default');
    const html = await format(output.html, {
      parser: 'html',
      printWidth: 120,
      htmlWhitespaceSensitivity: 'ignore',
    });
    return {
      sourceFile: 'skin.ts',
      source: `${imports.join('\n')}\n\nexport const skin = /* html */ \`${escapeTemplate(html.trim())}\`;\n`,
      styles: joinCss(sharedStyles, output.css),
    };
  }

  const program = createStyleProgram({
    design: await loadDesignSystem(tailwindInput),
    output: 'styles.css',
    tailwindVariables: 'inline',
    themeSelector: '.media-skin',
  });
  const source = await bundleReactSkin(entryFile, options.iconSet ?? 'default', program);
  const emitted = await program.emit();
  if (emitted.files.length !== 1) throw new Error('React Skin generation expected one merged CSS output file.');
  return {
    sourceFile: 'skin.tsx',
    source: `// @ts-nocheck -- temporary bundled output; authored types remain in packages/skins/canonical.\nimport './styles.css';\n${source}`,
    styles: joinCss(sharedStyles, emitted.files[0]?.source ?? ''),
  };
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
      if (!id.endsWith('.skin.tsx') && basename(id) !== 'skin.tsx') return null;
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

async function loadSharedStyles(item: ResolvedSkinItem, rootDir: string): Promise<string[]> {
  const resources = item.resources.styles ?? [];
  const paths = resources.filter((path) => path.endsWith('/base.css') || path.endsWith('/themes/default.css'));
  return Promise.all(paths.map((path) => readFile(resolve(rootDir, path), 'utf8')));
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

function joinCss(shared: readonly string[], extracted: string): string {
  return [...shared, extracted]
    .map((source) => source.trim())
    .filter(Boolean)
    .join('\n\n');
}

function isBareModule(id: string): boolean {
  return !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('\0');
}

function escapeTemplate(source: string): string {
  return source.replaceAll('`', '\\`').replaceAll('${', '\\${');
}
