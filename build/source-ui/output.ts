import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, posix, relative, resolve, sep } from 'node:path';
import { format } from 'prettier';
import {
  type ArtifactGraph,
  type ArtifactGraphNode,
  resolveArtifactClosure,
} from '../../packages/compiler/src/artifacts/index.ts';
import { compile } from '../../packages/compiler/src/index.ts';
import { renderSkinSourceOutput } from '../../packages/html/scripts/render-skin-source.ts';
import { resolveHtmlElementImports } from '../../packages/html/skins.compiler.config.ts';
import { createHtmlIconsSource, createReactIconsSource } from '../../packages/icons/scripts/source.ts';
import { createReactSkinSourceConfig } from '../../packages/react/skins.compiler.config.ts';

export type SourceFramework = 'html' | 'react';
export type SourceStyle = 'css' | 'tailwind';
export type SourceFileKind = 'source' | 'style';

export interface SourceTarget {
  framework: SourceFramework;
  style: SourceStyle;
}

export interface SourceOutputFile {
  path: string;
  target: string;
  kind: SourceFileKind;
  content: string;
}

export interface SourceOutputManifest {
  artifacts: Readonly<Record<string, readonly SourceOutputFile[]>>;
  dependencies: Readonly<Record<string, readonly string[]>>;
}

export interface CreateSourceOutputOptions {
  rootDir: string;
  target: SourceTarget;
  iconSet?: string | undefined;
  outputRoot?: string | undefined;
  targetRoot?: string | undefined;
}

interface ArtifactOutputContext {
  artifact: ArtifactGraphNode;
  artifactDir: string;
  entryFile: string;
}

/** Lower canonical artifacts to framework-owned source files without applying registry policy. */
export async function createSourceOutput(
  graph: ArtifactGraph,
  options: CreateSourceOutputOptions
): Promise<SourceOutputManifest> {
  const rootDir = resolve(options.rootDir);
  const outputRoot = options.outputRoot ?? 'generated';
  const targetRoot = options.targetRoot ?? 'components/videojs';
  const contexts = createArtifactContexts(graph, targetRoot, options.target);
  const entryArtifacts = new Map(
    [...contexts.values()].map((context) => [absoluteGraphPath(rootDir, context.artifact.entry), context])
  );
  const artifacts: Record<string, SourceOutputFile[]> = {};
  const dependencies: Record<string, string[]> = {};

  for (const context of [...contexts.values()].sort((a, b) => a.artifact.id.localeCompare(b.artifact.id))) {
    const files = await emitArtifact(context, {
      rootDir,
      target: options.target,
      iconSet: options.iconSet ?? 'default',
      outputRoot,
      targetRoot,
      graph,
      entryArtifacts,
    });
    artifacts[context.artifact.id] = files;
    dependencies[context.artifact.id] = collectPackageDependencies(files);
  }

  return { artifacts, dependencies };
}

async function emitArtifact(
  context: ArtifactOutputContext,
  options: {
    rootDir: string;
    target: SourceTarget;
    iconSet: string;
    outputRoot: string;
    targetRoot: string;
    graph: ArtifactGraph;
    entryArtifacts: ReadonlyMap<string, ArtifactOutputContext>;
  }
): Promise<SourceOutputFile[]> {
  const { artifact } = context;
  const outputFiles: SourceOutputFile[] = [];
  const inputFile = absoluteGraphPath(options.rootDir, artifact.entry);
  const tailwindInput = tailwindResource(artifact, options.rootDir);
  let entrySource: string;
  let extractedCss = '';

  if (options.target.framework === 'html') {
    const rendered = await renderSkinSourceOutput(inputFile, {
      style: options.target.style,
      ...(options.target.style === 'css' ? { tailwindInput } : {}),
    });
    entrySource = await format(rendered.html, {
      parser: 'html',
      printWidth: 120,
      htmlWhitespaceSensitivity: 'ignore',
    });
    extractedCss = rendered.css;
  } else {
    const canonical = await readFile(inputFile, 'utf8');
    const result = await compile(canonical, {
      filename: inputFile,
      config: createReactSkinSourceConfig({
        style: options.target.style,
        ...(options.target.style === 'css' ? { tailwindInput } : {}),
      }),
      configDir: resolve(options.rootDir, context.artifactDir),
      outputFile: resolve(options.rootDir, context.entryFile),
    });
    if (result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
      throw new Error(`Artifact \`${artifact.id}\` failed React lowering.`);
    }
    entrySource = rewriteRelativeImports(result.code, inputFile, context, options);
    extractedCss = result.assets.map((asset) => asset.source).join('\n\n');
  }

  const closure = resolveArtifactClosure(options.graph, artifact.id);
  const symbols = options.target.framework === 'html' ? closure.symbols : artifact.dependencies.symbols;
  const icons = symbols.icons ?? [];
  const components = symbols.components ?? [];

  if (icons.length > 0) {
    const content =
      options.target.framework === 'react'
        ? await createReactIconsSource(icons, options.iconSet)
        : await createHtmlIconsSource(icons, options.iconSet);
    const iconFile = options.target.framework === 'react' ? 'icons.tsx' : 'icons.ts';
    outputFiles.push(outputFile(options, posix.join(context.artifactDir, iconFile), content));
  }

  if (options.target.framework === 'html') {
    const imports = [
      ...(icons.length > 0 ? [`import './icons';`] : []),
      ...resolveHtmlElementImports(components).map((specifier) => `import '${specifier}';`),
    ];
    if (imports.length > 0) {
      outputFiles.push(outputFile(options, posix.join(context.artifactDir, 'elements.ts'), `${imports.join('\n')}\n`));
    }
  }

  const styleFiles = await emitStyleFiles(artifact, extractedCss, options);
  outputFiles.push(...styleFiles.files);
  if (styleFiles.entryImport) entrySource = `import '${styleFiles.entryImport}';\n${entrySource}`;
  outputFiles.push(outputFile(options, context.entryFile, entrySource));

  return outputFiles.sort((a, b) => a.path.localeCompare(b.path));
}

function createArtifactContexts(
  graph: ArtifactGraph,
  targetRoot: string,
  target: SourceTarget
): ReadonlyMap<string, ArtifactOutputContext> {
  return new Map(
    graph.artifacts.map((artifact) => {
      const artifactDir = posix.join(targetRoot, artifact.id);
      const entryFile = posix.join(artifactDir, outputEntryName(artifact.entry, target.framework));
      return [artifact.id, { artifact, artifactDir, entryFile }] as const;
    })
  );
}

async function emitStyleFiles(
  artifact: ArtifactGraphNode,
  extractedCss: string,
  options: {
    rootDir: string;
    target: SourceTarget;
    targetRoot: string;
    outputRoot: string;
  }
): Promise<{ files: SourceOutputFile[]; entryImport?: string | undefined }> {
  const files: SourceOutputFile[] = [];

  for (const resource of artifact.resources.styles ?? []) {
    const isTailwindInput = resource.endsWith('/tailwind.css');
    if (isTailwindInput && options.target.style === 'css') continue;

    const inputFile = absoluteGraphPath(options.rootDir, resource);
    const source = await readFile(inputFile, 'utf8');
    const target = posix.join(options.targetRoot, stripCanonicalPrefix(normalizePath(resource)));
    const content = isTailwindInput
      ? source
          .replace(/^@source .*;\s*$/gm, '')
          .replace(
            '@import "./themes/default.css";',
            '@import "./themes/default.css";\n\n@source "../**/*.{ts,tsx,html}";'
          )
      : source;
    files.push(outputFile(options, target, content));
  }

  if (options.target.style === 'tailwind') {
    return {
      files,
      ...(options.target.framework === 'react' ? { entryImport: '../styles/tailwind.css' } : {}),
    };
  }

  const artifactStyles = posix.join(options.targetRoot, artifact.id, 'styles.css');
  const content = [
    `@import '../styles/base.css';`,
    `@import '../styles/themes/default.css';`,
    ``,
    extractedCss.trim(),
    ``,
  ].join('\n');
  files.push(outputFile(options, artifactStyles, content));
  return {
    files,
    ...(options.target.framework === 'react' ? { entryImport: './styles.css' } : {}),
  };
}

function rewriteRelativeImports(
  source: string,
  inputFile: string,
  context: ArtifactOutputContext,
  options: {
    rootDir: string;
    entryArtifacts: ReadonlyMap<string, ArtifactOutputContext>;
  }
): string {
  return source.replace(/((?:\bfrom\s*|\bimport\s*)['"])([^'"]+)(['"])/g, (match, prefix, specifier, suffix) => {
    if (!specifier.startsWith('.')) return match;
    const importedFile = resolveSourceFile(inputFile, specifier);
    const dependency = options.entryArtifacts.get(importedFile);
    if (!existsSync(importedFile)) return match;
    if (!dependency) {
      throw new Error(
        `Artifact \`${context.artifact.id}\` cannot map relative import \`${specifier}\` from \`${normalizePath(
          relative(options.rootDir, inputFile)
        )}\`.`
      );
    }
    return `${prefix}${relativeModulePath(dirname(context.entryFile), withoutTypeScriptExtension(dependency.entryFile))}${suffix}`;
  });
}

function outputFile(
  options: { outputRoot: string; target: SourceTarget },
  target: string,
  content: string
): SourceOutputFile {
  return {
    path: posix.join(options.outputRoot, options.target.framework, options.target.style, target),
    target,
    kind: target.endsWith('.css') ? 'style' : 'source',
    content,
  };
}

function collectPackageDependencies(files: readonly SourceOutputFile[]): string[] {
  const packages = new Set<string>();
  for (const file of files) {
    if (file.kind === 'style') continue;
    for (const match of file.content.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
      const specifier = match[1];
      if (specifier && !specifier.startsWith('.')) packages.add(packageName(specifier));
    }
  }
  return [...packages].sort();
}

function tailwindResource(artifact: ArtifactGraphNode, rootDir: string): string {
  const resource = artifact.resources.styles?.find((path) => path.endsWith('/tailwind.css'));
  if (!resource) throw new Error(`Artifact \`${artifact.id}\` has no Tailwind style resource.`);
  return absoluteGraphPath(rootDir, resource);
}

function outputEntryName(entry: string, framework: SourceFramework): string {
  const base = basename(entry).replace(/\.skin(?=\.[^.]+$)/, '');
  return framework === 'html' ? base.replace(/\.[^.]+$/, '.html') : base;
}

function stripCanonicalPrefix(path: string): string {
  return path.replace(/^\.\/canonical\//, '');
}

function absoluteGraphPath(rootDir: string, path: string): string {
  return resolve(rootDir, path);
}

function resolveSourceFile(inputFile: string, specifier: string): string {
  const candidate = resolve(dirname(inputFile), specifier);
  if (['.ts', '.tsx', '.mts', '.cts'].includes(extname(candidate))) return candidate;
  for (const extension of ['.ts', '.tsx', '.mts', '.cts']) {
    const fileName = `${candidate}${extension}`;
    if (existsSync(fileName)) return fileName;
  }
  return candidate;
}

function withoutTypeScriptExtension(path: string): string {
  return path.replace(/\.(?:[cm]?ts|tsx)$/, '');
}

function relativeModulePath(from: string, to: string): string {
  const path = posix.relative(normalizePath(from), normalizePath(to));
  return path.startsWith('.') ? path : `./${path}`;
}

function normalizePath(path: string): string {
  return path.split(sep).join('/');
}

function packageName(specifier: string): string {
  if (!specifier.startsWith('@')) return specifier.split('/')[0] ?? specifier;
  return specifier.split('/').slice(0, 2).join('/');
}
