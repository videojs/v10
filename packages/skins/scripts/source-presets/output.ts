import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, posix, resolve, sep } from 'node:path';
import type { ArtifactGraph, ArtifactGraphNode } from '@videojs/compiler/artifacts';
import { collectModuleSpecifiers } from '@videojs/compiler/ast';

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

export interface CreateFrameworkSourceOutputOptions {
  rootDir: string;
  style: SourceStyle;
  artifactIds?: readonly string[] | undefined;
  iconSet?: string | undefined;
  outputRoot?: string | undefined;
  targetRoot?: string | undefined;
  /** Place this artifact directly in `targetRoot` instead of an artifact subdirectory. */
  rootArtifactId?: string | undefined;
}

export interface ResolvedSourceOutputOptions {
  framework: SourceFramework;
  style: SourceStyle;
  rootDir: string;
  artifactIds?: readonly string[] | undefined;
  iconSet: string;
  outputRoot: string;
  targetRoot: string;
  rootArtifactId?: string | undefined;
}

export interface SourceArtifactLayout {
  artifact: ArtifactGraphNode;
  artifactDir: string;
  entryFile: string;
  inputFile: string;
  tailwindInput: string;
}

export interface SourceArtifactContext extends SourceArtifactLayout {
  graph: ArtifactGraph;
  layoutsByInput: ReadonlyMap<string, SourceArtifactLayout>;
  options: ResolvedSourceOutputOptions;
}

export interface SourceOutputAdapter {
  framework: SourceFramework;
  outputEntryName(entry: string): string;
  emitArtifact(context: SourceArtifactContext): Promise<SourceOutputFile[]>;
  finish?(artifacts: Record<string, SourceOutputFile[]>, options: ResolvedSourceOutputOptions): void | Promise<void>;
}

/** Apply one framework adapter to a canonical artifact graph. */
export async function createFrameworkSourceOutput(
  graph: ArtifactGraph,
  options: CreateFrameworkSourceOutputOptions,
  adapter: SourceOutputAdapter
): Promise<SourceOutputManifest> {
  const resolved = resolveOptions(options, adapter.framework);
  const layouts = createArtifactLayouts(graph, resolved, adapter.outputEntryName);
  const layoutsByInput = new Map(layouts.map((layout) => [layout.inputFile, layout]));
  const selected = selectLayouts(layouts, resolved.artifactIds);
  const artifacts: Record<string, SourceOutputFile[]> = {};

  for (const layout of selected) {
    artifacts[layout.artifact.id] = await adapter.emitArtifact({
      ...layout,
      graph,
      layoutsByInput,
      options: resolved,
    });
  }

  await adapter.finish?.(artifacts, resolved);

  const dependencies: Record<string, string[]> = {};
  for (const [artifactId, files] of Object.entries(artifacts)) {
    files.sort((a, b) => a.path.localeCompare(b.path));
    dependencies[artifactId] = collectPackageDependencies(files);
  }
  return { artifacts, dependencies };
}

export async function createStyleResourceFiles(context: SourceArtifactContext): Promise<SourceOutputFile[]> {
  const files: SourceOutputFile[] = [];
  for (const resource of context.artifact.resources.styles ?? []) {
    const isTailwindInput = resource.endsWith('/tailwind.css');
    if (isTailwindInput && context.options.style === 'css') continue;

    const inputFile = absoluteGraphPath(context.options.rootDir, resource);
    const source = await readFile(inputFile, 'utf8');
    const target = posix.join(context.options.targetRoot, stripCanonicalPrefix(toPosixPath(resource)));
    const content = isTailwindInput ? rewriteTailwindInput(source, inputFile) : source;
    files.push(createSourceOutputFile(context.options, target, content));
  }
  return files;
}

export function createExtractedStyleFile(
  context: SourceArtifactContext,
  css: string,
  options: { support?: boolean | undefined } = {}
): SourceOutputFile {
  const target = posix.join(context.artifactDir, 'styles.css');
  const stylesDir = posix.join(context.options.targetRoot, 'styles');
  const relativeStylesDir = relativeModulePath(posix.dirname(target), stylesDir);
  const content = [
    `@import '${relativeStylesDir}/base.css';`,
    `@import '${relativeStylesDir}/themes/default.css';`,
    ...(options.support ? [`@import '${relativeStylesDir}/support.css';`] : []),
    '',
    css.trim(),
    '',
  ].join('\n');
  return createSourceOutputFile(context.options, target, content);
}

export function createSourceOutputFile(
  options: ResolvedSourceOutputOptions,
  target: string,
  content: string
): SourceOutputFile {
  return {
    path: posix.join(options.outputRoot, options.framework, options.style, target),
    target,
    kind: target.endsWith('.css') ? 'style' : 'source',
    content,
  };
}

export function sourceEntryName(entry: string, framework: SourceFramework): string {
  const base = basename(entry).replace(/\.skin(?=\.[^.]+$)/, '');
  return framework === 'html' ? base.replace(/\.[^.]+$/, '.html') : base;
}

export function resolveSourceFile(inputFile: string, specifier: string): string {
  const candidate = resolve(dirname(inputFile), specifier);
  if (['.ts', '.tsx', '.mts', '.cts'].includes(extname(candidate))) return candidate;
  for (const extension of ['.ts', '.tsx', '.mts', '.cts']) {
    const fileName = `${candidate}${extension}`;
    if (existsSync(fileName)) return fileName;
  }
  return candidate;
}

export function relativeModulePath(from: string, to: string): string {
  const path = posix.relative(toPosixPath(from), toPosixPath(to));
  return path.startsWith('.') ? path : `./${path}`;
}

export function withoutTypeScriptExtension(path: string): string {
  return path.replace(/\.(?:[cm]?ts|tsx)$/, '');
}

export function toPosixPath(path: string): string {
  return path.split(sep).join('/');
}

function resolveOptions(
  options: CreateFrameworkSourceOutputOptions,
  framework: SourceFramework
): ResolvedSourceOutputOptions {
  return {
    framework,
    style: options.style,
    rootDir: resolve(options.rootDir),
    ...(options.artifactIds ? { artifactIds: options.artifactIds } : {}),
    iconSet: options.iconSet ?? 'default',
    outputRoot: options.outputRoot ?? 'generated',
    targetRoot: options.targetRoot ?? 'components/videojs',
    ...(options.rootArtifactId ? { rootArtifactId: options.rootArtifactId } : {}),
  };
}

function createArtifactLayouts(
  graph: ArtifactGraph,
  options: ResolvedSourceOutputOptions,
  outputEntryName: SourceOutputAdapter['outputEntryName']
): SourceArtifactLayout[] {
  return graph.artifacts.map((artifact) => {
    const artifactDir =
      artifact.id === options.rootArtifactId ? options.targetRoot : posix.join(options.targetRoot, artifact.id);
    return {
      artifact,
      artifactDir,
      entryFile: posix.join(artifactDir, outputEntryName(artifact.entry)),
      inputFile: absoluteGraphPath(options.rootDir, artifact.entry),
      tailwindInput: tailwindResource(artifact, options.rootDir),
    };
  });
}

function selectLayouts(
  layouts: readonly SourceArtifactLayout[],
  artifactIds: readonly string[] | undefined
): SourceArtifactLayout[] {
  const byId = new Map(layouts.map((layout) => [layout.artifact.id, layout]));
  const selected = artifactIds ?? [...byId.keys()];
  return [...selected].sort().map((id) => byId.get(id) ?? missingArtifact(id));
}

function missingArtifact(id: string): never {
  throw new Error(`Source output references missing artifact \`${id}\`.`);
}

function collectPackageDependencies(files: readonly SourceOutputFile[]): string[] {
  const packages = new Set<string>();
  for (const file of files) {
    if (file.kind === 'style' || !/\.[cm]?[jt]sx?$/.test(file.target)) continue;
    for (const specifier of collectModuleSpecifiers(file.content, file.target)) {
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

function rewriteTailwindInput(source: string, inputFile: string): string {
  const marker = '@import "./themes/default.css";';
  if (!source.includes(marker)) {
    throw new Error(`Tailwind source entry \`${inputFile}\` is missing the expected theme import marker.`);
  }
  return source.replace(/^@source .*;\s*$/gm, '').replace(marker, `${marker}\n\n@source "../**/*.{ts,tsx,html}";`);
}

function stripCanonicalPrefix(path: string): string {
  return path.replace(/^\.\/canonical\//, '');
}

function absoluteGraphPath(rootDir: string, path: string): string {
  return resolve(rootDir, path);
}

function packageName(specifier: string): string {
  if (!specifier.startsWith('@')) return specifier.split('/')[0] ?? specifier;
  return specifier.split('/').slice(0, 2).join('/');
}
