import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, posix, relative, resolve } from 'node:path';
import { type DeclarationBlock, type Rule, transform } from 'lightningcss';
import { format } from 'prettier';
import {
  type ArtifactGraph,
  type ArtifactGraphNode,
  resolveArtifactClosure,
} from '../../packages/compiler/src/artifacts/index.ts';
import { compile } from '../../packages/compiler/src/index.ts';
import { cloneCssAst, withoutNullValues } from '../../packages/compiler/src/tailwind/css/ast.ts';
import { createStyleClassRegistry, type StyleClassRegistry } from '../../packages/compiler/src/tailwind/index.ts';
import {
  collectModuleSpecifiers,
  rewriteModuleSpecifiers,
} from '../../packages/compiler/src/utils/module-specifiers.ts';
import { renderSkinSourceOutput } from '../../packages/html/scripts/render-skins.ts';
import { resolveHtmlElementImports } from '../../packages/html/skins.compiler.config.ts';
import { createReactSkinSourceConfig } from '../../packages/react/skins.compiler.config.ts';
import { toPosixPath } from './path.ts';

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
  /** Place this artifact directly in `targetRoot` instead of an artifact subdirectory. */
  rootArtifactId?: string | undefined;
}

interface ArtifactOutputContext {
  artifact: ArtifactGraphNode;
  artifactDir: string;
  entryFile: string;
}

interface EmittedArtifact {
  files: SourceOutputFile[];
  supportCss?: string | undefined;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Emit canonical artifacts as framework-owned source files without applying registry policy. */
export async function createSourceOutput(
  graph: ArtifactGraph,
  options: CreateSourceOutputOptions
): Promise<SourceOutputManifest> {
  const rootDir = resolve(options.rootDir);
  const outputRoot = options.outputRoot ?? 'generated';
  const targetRoot = options.targetRoot ?? 'components/videojs';
  const contexts = createArtifactContexts(graph, targetRoot, options.target, options.rootArtifactId);
  const entryArtifacts = new Map(
    [...contexts.values()].map((context) => [absoluteGraphPath(rootDir, context.artifact.entry), context])
  );
  const artifacts: Record<string, SourceOutputFile[]> = {};
  const dependencies: Record<string, string[]> = {};
  const supportSources: string[] = [];
  const styleRegistry =
    options.target.framework === 'react' && options.target.style === 'css' ? createStyleClassRegistry() : undefined;

  for (const context of [...contexts.values()].sort((a, b) => a.artifact.id.localeCompare(b.artifact.id))) {
    const emitted = await emitArtifact(context, {
      rootDir,
      target: options.target,
      iconSet: options.iconSet ?? 'default',
      outputRoot,
      targetRoot,
      graph,
      entryArtifacts,
      styleRegistry,
    });
    const files = emitted.files;
    if (emitted.supportCss) supportSources.push(emitted.supportCss);
    artifacts[context.artifact.id] = files;
    dependencies[context.artifact.id] = collectPackageDependencies(files);
  }

  if (options.target.framework === 'react' && options.target.style === 'css' && supportSources.length > 0) {
    const support = consolidateSupportCss(supportSources);
    for (const files of Object.values(artifacts)) {
      files.push(outputFile({ ...options, outputRoot }, posix.join(targetRoot, 'styles/support.css'), support));
      files.sort((a, b) => a.path.localeCompare(b.path));
    }
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
    styleRegistry?: StyleClassRegistry | undefined;
  }
): Promise<EmittedArtifact> {
  const { artifact } = context;
  const outputFiles: SourceOutputFile[] = [];
  const inputFile = absoluteGraphPath(options.rootDir, artifact.entry);
  const tailwindInput = tailwindResource(artifact, options.rootDir);
  let entrySource: string;
  let extractedCss = '';
  let supportCss: string | undefined;

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
        iconSet: options.iconSet,
        ...(options.target.style === 'css' ? { tailwindInput } : {}),
        ...(options.styleRegistry ? { styleRegistry: options.styleRegistry } : {}),
      }),
      configDir: resolve(options.rootDir, context.artifactDir),
      outputFile: resolve(options.rootDir, context.entryFile),
    });
    if (result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
      throw new Error(`Artifact \`${artifact.id}\` failed React source emission.`);
    }
    entrySource = rewriteRelativeImports(result.code, inputFile, context, options);
    extractedCss = result.assets.find((asset) => !asset.fileName.endsWith('.support.css'))?.source ?? '';
    supportCss = result.assets.find((asset) => asset.fileName.endsWith('.support.css'))?.source;
  }

  const closure = resolveArtifactClosure(options.graph, artifact.id);
  const symbols = options.target.framework === 'html' ? closure.symbols : artifact.dependencies.symbols;
  const icons = symbols.icons ?? [];
  const components = symbols.components ?? [];

  if (options.target.framework === 'html') {
    const imports = [
      ...(icons.length > 0 ? [`import '${htmlIconElementImport(options.iconSet)}';`] : []),
      ...resolveHtmlElementImports(components).map((specifier) => `import '${specifier}';`),
    ];
    if (imports.length > 0) {
      outputFiles.push(outputFile(options, posix.join(context.artifactDir, 'elements.ts'), `${imports.join('\n')}\n`));
    }
  }

  const styleFiles = await emitStyleFiles(context, extractedCss, options);
  outputFiles.push(...styleFiles.files);
  if (styleFiles.entryImport) entrySource = `import '${styleFiles.entryImport}';\n${entrySource}`;
  outputFiles.push(outputFile(options, context.entryFile, entrySource));

  return {
    files: outputFiles.sort((a, b) => a.path.localeCompare(b.path)),
    ...(supportCss ? { supportCss } : {}),
  };
}

function createArtifactContexts(
  graph: ArtifactGraph,
  targetRoot: string,
  target: SourceTarget,
  rootArtifactId: string | undefined
): ReadonlyMap<string, ArtifactOutputContext> {
  return new Map(
    graph.artifacts.map((artifact) => {
      const artifactDir = artifact.id === rootArtifactId ? targetRoot : posix.join(targetRoot, artifact.id);
      const entryFile = posix.join(artifactDir, outputEntryName(artifact.entry, target.framework));
      return [artifact.id, { artifact, artifactDir, entryFile }] as const;
    })
  );
}

async function emitStyleFiles(
  context: ArtifactOutputContext,
  extractedCss: string,
  options: {
    rootDir: string;
    target: SourceTarget;
    targetRoot: string;
    outputRoot: string;
  }
): Promise<{ files: SourceOutputFile[]; entryImport?: string | undefined }> {
  const { artifact, artifactDir } = context;
  const files: SourceOutputFile[] = [];

  for (const resource of artifact.resources.styles ?? []) {
    const isTailwindInput = resource.endsWith('/tailwind.css');
    if (isTailwindInput && options.target.style === 'css') continue;

    const inputFile = absoluteGraphPath(options.rootDir, resource);
    const source = await readFile(inputFile, 'utf8');
    const target = posix.join(options.targetRoot, stripCanonicalPrefix(toPosixPath(resource)));
    const content = isTailwindInput ? rewriteTailwindInput(source, inputFile) : source;
    files.push(outputFile(options, target, content));
  }

  if (options.target.style === 'tailwind') {
    return {
      files,
      ...(options.target.framework === 'react'
        ? {
            entryImport: relativeModulePath(
              posix.dirname(context.entryFile),
              posix.join(options.targetRoot, 'styles/tailwind.css')
            ),
          }
        : {}),
    };
  }

  const artifactStyles = posix.join(artifactDir, 'styles.css');
  const stylesDir = posix.join(options.targetRoot, 'styles');
  const relativeStylesDir = relativeModulePath(posix.dirname(artifactStyles), stylesDir);
  const content = [
    `@import '${relativeStylesDir}/base.css';`,
    `@import '${relativeStylesDir}/themes/default.css';`,
    ...(options.target.framework === 'react' ? [`@import '${relativeStylesDir}/support.css';`] : []),
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

function rewriteTailwindInput(source: string, inputFile: string): string {
  const marker = '@import "./themes/default.css";';
  if (!source.includes(marker)) {
    throw new Error(`Tailwind source entry \`${inputFile}\` is missing the expected theme import marker.`);
  }
  return source.replace(/^@source .*;\s*$/gm, '').replace(marker, `${marker}\n\n@source "../**/*.{ts,tsx,html}";`);
}

function consolidateSupportCss(sources: readonly string[]): string {
  const result = transform({
    filename: 'support.css',
    code: encoder.encode(sources.join('\n')),
    visitor: {
      StyleSheet(stylesheet) {
        const rules: Rule[] = [];
        const seen = new Set<string>();
        let theme: Extract<Rule, { type: 'style' }> | undefined;

        for (const rule of stylesheet.rules) {
          if (isMediaSkinRule(rule)) {
            if (!theme) theme = cloneCssAst(rule);
            else appendDeclarations(theme.value.declarations, rule.value.declarations);
            continue;
          }

          const key = JSON.stringify(rule);
          if (seen.has(key)) continue;
          seen.add(key);
          rules.push(cloneCssAst(rule));
        }

        return withoutNullValues({
          ...stylesheet,
          rules: theme ? [theme, ...rules] : rules,
          licenseComments: [...new Set(stylesheet.licenseComments)],
        });
      },
    },
  });
  return decoder.decode(result.code).trim();
}

function isMediaSkinRule(rule: Rule): rule is Extract<Rule, { type: 'style' }> {
  if (rule.type !== 'style' || rule.value.selectors.length !== 1) return false;
  const selector = rule.value.selectors[0];
  return selector?.length === 1 && selector[0]?.type === 'class' && selector[0].name === 'media-skin';
}

function appendDeclarations(target: DeclarationBlock, source: DeclarationBlock): void {
  target.declarations.push(...source.declarations.map(cloneCssAst));
  target.importantDeclarations.push(...source.importantDeclarations.map(cloneCssAst));
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
  return rewriteModuleSpecifiers(source, {
    filename: context.entryFile,
    resolve(specifier) {
      if (!specifier.startsWith('.')) return specifier;
      const importedFile = resolveSourceFile(inputFile, specifier);
      const dependency = options.entryArtifacts.get(importedFile);
      if (!existsSync(importedFile)) {
        throw new Error(
          `Artifact \`${context.artifact.id}\` has unresolved relative import \`${specifier}\` from \`${toPosixPath(
            relative(options.rootDir, inputFile)
          )}\`.`
        );
      }
      if (!dependency) {
        throw new Error(
          `Artifact \`${context.artifact.id}\` cannot map relative import \`${specifier}\` from \`${toPosixPath(
            relative(options.rootDir, inputFile)
          )}\`.`
        );
      }
      return relativeModulePath(dirname(context.entryFile), withoutTypeScriptExtension(dependency.entryFile));
    },
  });
}

function htmlIconElementImport(iconSet: string): string {
  return iconSet === 'default' ? '@videojs/html/icons/element' : `@videojs/html/icons/element/${iconSet}`;
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
  const path = posix.relative(toPosixPath(from), toPosixPath(to));
  return path.startsWith('.') ? path : `./${path}`;
}

function packageName(specifier: string): string {
  if (!specifier.startsWith('@')) return specifier.split('/')[0] ?? specifier;
  return specifier.split('/').slice(0, 2).join('/');
}
