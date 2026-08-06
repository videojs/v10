import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import type { CompilerDiagnostic } from './config';
import { DiagnosticError } from './diagnostics';

export const ARTIFACT_GRAPH_VERSION = 1 as const;

export type ArtifactMetadataValue =
  | string
  | number
  | boolean
  | null
  | readonly ArtifactMetadataValue[]
  | { readonly [key: string]: ArtifactMetadataValue };
export type ArtifactMetadata = Readonly<Record<string, ArtifactMetadataValue>>;

/** Opaque resource groups whose names and meaning are owned by the artifact consumer. */
export type ArtifactResources = Readonly<Record<string, readonly string[]>>;

/** Named imports grouped by the consumer-provided `dependencyModules` classification. */
export type ArtifactSymbols = Readonly<Record<string, readonly string[]>>;

export interface ArtifactDefinition<
  Kind extends string = string,
  Metadata extends ArtifactMetadata = ArtifactMetadata,
> {
  id: string;
  kind: Kind;
  entry: string;
  resources?: ArtifactResources | undefined;
  metadata?: Metadata | undefined;
}

export interface BuildArtifactGraphOptions {
  rootDir: string;
  dependencyModules?: Readonly<Record<string, string>> | undefined;
  isArtifactEntry?: ((fileName: string) => boolean) | undefined;
}

export interface ArtifactFile {
  path: string;
  role: 'entry' | 'source';
}

export interface ArtifactDependencies {
  artifacts: readonly string[];
  packages: readonly string[];
  symbols: ArtifactSymbols;
}

export interface ArtifactGraphNode {
  id: string;
  kind: string;
  entry: string;
  files: readonly ArtifactFile[];
  resources: ArtifactResources;
  dependencies: ArtifactDependencies;
  metadata?: ArtifactMetadata | undefined;
}

export interface ArtifactGraph {
  version: typeof ARTIFACT_GRAPH_VERSION;
  artifacts: readonly ArtifactGraphNode[];
}

export interface BuildArtifactGraphResult {
  graph: ArtifactGraph;
  diagnostics: readonly CompilerDiagnostic[];
}

export interface ArtifactClosure extends ArtifactDependencies {
  artifactIds: readonly string[];
  files: readonly ArtifactFile[];
  resources: ArtifactResources;
}

interface NormalizedArtifactDefinition {
  definition: ArtifactDefinition;
  entryFile: string;
  entryPath: string;
}

interface ModuleReference {
  source: string;
  node: ts.StringLiteralLike;
  names: readonly string[];
  ambiguous: boolean;
}

interface MutableDependencies {
  artifacts: Set<string>;
  packages: Set<string>;
  symbols: Map<string, Set<string>>;
}

/** Preserve literal artifact metadata while checking the authored contract. */
export function defineArtifact<const Definition extends ArtifactDefinition>(definition: Definition): Definition {
  return definition;
}

export async function buildArtifactGraph(
  definitions: readonly ArtifactDefinition[],
  options: BuildArtifactGraphOptions
): Promise<BuildArtifactGraphResult> {
  const rootDir = resolve(options.rootDir);
  const diagnostics: CompilerDiagnostic[] = [];
  const normalized = normalizeDefinitions(definitions, rootDir, diagnostics);
  const entries = new Map(normalized.map((artifact) => [artifact.entryFile, artifact]));
  const nodes: ArtifactGraphNode[] = [];

  for (const artifact of normalized) {
    const dependencies = createMutableDependencies(Object.values(options.dependencyModules ?? {}));
    const files = new Set<string>();
    const visited = new Set<string>();

    await visitArtifactFile({
      artifact,
      fileName: artifact.entryFile,
      rootDir,
      entries,
      files,
      visited,
      dependencies,
      diagnostics,
      options,
    });

    const artifactFiles = [...files]
      .map(
        (fileName): ArtifactFile => ({
          path: graphPath(rootDir, fileName),
          role: fileName === artifact.entryFile ? 'entry' : 'source',
        })
      )
      .sort((a, b) => compareStrings(a.path, b.path));

    nodes.push({
      id: artifact.definition.id,
      kind: artifact.definition.kind,
      entry: artifact.entryPath,
      files: artifactFiles,
      resources: normalizeGroups(artifact.definition.resources ?? {}),
      dependencies: freezeDependencies(dependencies),
      ...(artifact.definition.metadata ? { metadata: sortMetadata(artifact.definition.metadata) } : {}),
    });
  }

  nodes.sort((a, b) => compareStrings(a.id, b.id));
  diagnoseArtifactCycles(nodes, diagnostics);

  return {
    graph: { version: ARTIFACT_GRAPH_VERSION, artifacts: nodes },
    diagnostics: sortDiagnostics(diagnostics),
  };
}

export function resolveArtifactClosure(graph: ArtifactGraph, artifactId: string): ArtifactClosure {
  const artifacts = new Map(graph.artifacts.map((artifact) => [artifact.id, artifact]));
  if (!artifacts.has(artifactId)) {
    throw new DiagnosticError(`Artifact \`${artifactId}\` does not exist in the graph.`, {
      diagnosticCode: 'artifact-not-found',
    });
  }

  const artifactIds: string[] = [];
  const visited = new Set<string>();
  const files = new Map<string, ArtifactFile>();
  const resources = new Map<string, Set<string>>();
  const packages = new Set<string>();
  const symbols = new Map<string, Set<string>>();

  const visit = (id: string): void => {
    if (visited.has(id)) return;
    visited.add(id);

    const artifact = artifacts.get(id);
    if (!artifact) {
      throw new DiagnosticError(`Artifact \`${artifactId}\` depends on missing artifact \`${id}\`.`, {
        diagnosticCode: 'artifact-dependency-missing',
      });
    }

    for (const dependency of artifact.dependencies.artifacts) visit(dependency);
    artifactIds.push(id);

    for (const file of artifact.files) {
      const previous = files.get(file.path);
      if (!previous || file.role === 'entry') files.set(file.path, file);
    }
    mergeGroups(resources, artifact.resources);
    for (const dependency of artifact.dependencies.packages) packages.add(dependency);
    mergeGroups(symbols, artifact.dependencies.symbols);
  };

  visit(artifactId);

  return {
    artifactIds,
    files: [...files.values()].sort((a, b) => compareStrings(a.path, b.path)),
    resources: freezeGroups(resources),
    artifacts: artifactIds.filter((id) => id !== artifactId),
    packages: sortedUnique(packages),
    symbols: freezeGroups(symbols),
  };
}

export function serializeArtifactGraph(graph: ArtifactGraph): string {
  return `${JSON.stringify(graph, null, 2)}\n`;
}

function normalizeDefinitions(
  definitions: readonly ArtifactDefinition[],
  rootDir: string,
  diagnostics: CompilerDiagnostic[]
): NormalizedArtifactDefinition[] {
  const normalized: NormalizedArtifactDefinition[] = [];
  const ids = new Set<string>();
  const entries = new Set<string>();

  for (const definition of [...definitions].sort((a, b) => compareStrings(a.id, b.id))) {
    if (ids.has(definition.id)) {
      diagnostics.push(
        errorDiagnostic('artifact-duplicate-id', `Artifact ID \`${definition.id}\` is declared more than once.`)
      );
      continue;
    }
    ids.add(definition.id);

    const entryFile = resolve(rootDir, definition.entry);
    if (!isWithinRoot(rootDir, entryFile)) {
      diagnostics.push(
        errorDiagnostic(
          'artifact-entry-outside-root',
          `Artifact \`${definition.id}\` entry must stay inside the artifact root.`,
          entryFile
        )
      );
      continue;
    }
    if (entries.has(entryFile)) {
      diagnostics.push(
        errorDiagnostic(
          'artifact-duplicate-entry',
          `Artifact entry \`${graphPath(rootDir, entryFile)}\` is declared more than once.`,
          entryFile
        )
      );
      continue;
    }
    entries.add(entryFile);
    normalized.push({ definition, entryFile, entryPath: graphPath(rootDir, entryFile) });
  }

  return normalized;
}

async function visitArtifactFile(context: {
  artifact: NormalizedArtifactDefinition;
  fileName: string;
  rootDir: string;
  entries: ReadonlyMap<string, NormalizedArtifactDefinition>;
  files: Set<string>;
  visited: Set<string>;
  dependencies: MutableDependencies;
  diagnostics: CompilerDiagnostic[];
  options: BuildArtifactGraphOptions;
}): Promise<void> {
  const { artifact, fileName, rootDir, entries, files, visited, dependencies, diagnostics, options } = context;
  if (visited.has(fileName)) return;
  visited.add(fileName);

  let sourceText: string;
  try {
    sourceText = await readFile(fileName, 'utf8');
  } catch {
    diagnostics.push(
      errorDiagnostic(
        fileName === artifact.entryFile ? 'artifact-entry-missing' : 'artifact-source-missing',
        `Artifact \`${artifact.definition.id}\` cannot read \`${graphPath(rootDir, fileName)}\`.`,
        fileName
      )
    );
    return;
  }

  files.add(fileName);
  if (!sourceExtensions.has(extname(fileName))) return;

  const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, scriptKind(fileName));

  for (const reference of collectModuleReferences(sourceFile)) {
    if (!reference.source.startsWith('.')) {
      dependencies.packages.add(packageName(reference.source));
      const symbolKind = options.dependencyModules?.[reference.source];
      if (symbolKind === undefined) continue;

      if (reference.ambiguous) {
        diagnostics.push(
          nodeDiagnostic(
            sourceFile,
            reference.node,
            'artifact-dependency-ambiguous',
            `Artifact \`${artifact.definition.id}\` must use named imports from \`${reference.source}\` so ${symbolKind} dependencies can be inferred.`
          )
        );
      }

      const target = getOrCreateGroup(dependencies.symbols, symbolKind);
      for (const name of reference.names) target.add(name);
      continue;
    }

    const importedFile = await resolveImportedFile(fileName, reference.source);
    if (!importedFile) {
      diagnostics.push(
        nodeDiagnostic(
          sourceFile,
          reference.node,
          'artifact-import-missing',
          `Artifact \`${artifact.definition.id}\` cannot resolve \`${reference.source}\`.`
        )
      );
      continue;
    }

    if (!isWithinRoot(rootDir, importedFile)) {
      diagnostics.push(
        nodeDiagnostic(
          sourceFile,
          reference.node,
          'artifact-import-outside-root',
          `Artifact \`${artifact.definition.id}\` imports source outside the artifact root.`
        )
      );
      continue;
    }

    const dependency = entries.get(importedFile);
    if (dependency && dependency.definition.id !== artifact.definition.id) {
      dependencies.artifacts.add(dependency.definition.id);
      continue;
    }

    if (options.isArtifactEntry?.(importedFile) && importedFile !== artifact.entryFile) {
      diagnostics.push(
        nodeDiagnostic(
          sourceFile,
          reference.node,
          'artifact-entry-unregistered',
          `Artifact source \`${graphPath(rootDir, importedFile)}\` must have an authored artifact entry.`
        )
      );
      continue;
    }

    await visitArtifactFile({ ...context, fileName: importedFile });
  }
}

function collectModuleReferences(sourceFile: ts.SourceFile): ModuleReference[] {
  const references: ModuleReference[] = [];
  const usedNames = collectUsedNames(sourceFile);

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteralLike(statement.moduleSpecifier)) {
      const names: string[] = [];
      let ambiguous = false;
      const clause = statement.importClause;
      if (clause && !clause.isTypeOnly) {
        if (clause.name && usedNames.has(clause.name.text)) ambiguous = true;
        if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
          if (usedNames.has(clause.namedBindings.name.text)) ambiguous = true;
        } else if (clause.namedBindings) {
          for (const element of clause.namedBindings.elements) {
            if (!element.isTypeOnly && usedNames.has(element.name.text)) {
              names.push(element.propertyName?.text ?? element.name.text);
            }
          }
        }
      }
      references.push({ source: statement.moduleSpecifier.text, node: statement.moduleSpecifier, names, ambiguous });
      continue;
    }

    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteralLike(statement.moduleSpecifier)
    ) {
      const names =
        statement.exportClause && ts.isNamedExports(statement.exportClause)
          ? statement.exportClause.elements
              .filter((element) => !element.isTypeOnly)
              .map((element) => element.propertyName?.text ?? element.name.text)
          : [];
      references.push({
        source: statement.moduleSpecifier.text,
        node: statement.moduleSpecifier,
        names,
        ambiguous: !statement.exportClause || ts.isNamespaceExport(statement.exportClause),
      });
    }
  }

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0]!)
    ) {
      references.push({ source: node.arguments[0]!.text, node: node.arguments[0]!, names: [], ambiguous: true });
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      references.push({ source: node.argument.literal.text, node: node.argument.literal, names: [], ambiguous: false });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return references;
}

function collectUsedNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) return;
    if (ts.isIdentifier(node)) names.add(node.text);
    ts.forEachChild(node, visit);
  };
  for (const statement of sourceFile.statements) visit(statement);
  return names;
}

async function resolveImportedFile(importer: string, source: string): Promise<string | null> {
  const base = resolve(dirname(importer), source);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Continue through the deterministic resolution candidates.
    }
  }
  return null;
}

const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);

function diagnoseArtifactCycles(nodes: readonly ArtifactGraphNode[], diagnostics: CompilerDiagnostic[]): void {
  const artifacts = new Map(nodes.map((node) => [node.id, node]));
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];
  const reported = new Set<string>();

  const visit = (id: string): void => {
    if (active.has(id)) {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id];
      const key = [...new Set(cycle)].sort().join(':');
      if (!reported.has(key)) {
        reported.add(key);
        diagnostics.push(
          errorDiagnostic('artifact-dependency-cycle', `Artifact dependency cycle: ${cycle.join(' -> ')}.`)
        );
      }
      return;
    }
    if (visited.has(id)) return;

    visited.add(id);
    active.add(id);
    stack.push(id);
    const artifact = artifacts.get(id);
    if (artifact) {
      for (const dependency of artifact.dependencies.artifacts) visit(dependency);
    }
    stack.pop();
    active.delete(id);
  };

  for (const node of nodes) visit(node.id);
}

function createMutableDependencies(symbolKinds: Iterable<string> = []): MutableDependencies {
  return {
    artifacts: new Set(),
    packages: new Set(),
    symbols: createMutableGroups(symbolKinds),
  };
}

function freezeDependencies(dependencies: MutableDependencies): ArtifactDependencies {
  return {
    artifacts: sortedUnique(dependencies.artifacts),
    packages: sortedUnique(dependencies.packages),
    symbols: freezeGroups(dependencies.symbols),
  };
}

function createMutableGroups(keys: Iterable<string> = []): Map<string, Set<string>> {
  const groups = new Map<string, Set<string>>();
  for (const key of keys) getOrCreateGroup(groups, key);
  return groups;
}

function getOrCreateGroup(groups: Map<string, Set<string>>, key: string): Set<string> {
  let values = groups.get(key);
  if (!values) {
    values = new Set();
    groups.set(key, values);
  }
  return values;
}

function mergeGroups(target: Map<string, Set<string>>, source: Readonly<Record<string, readonly string[]>>): void {
  for (const [key, values] of Object.entries(source)) {
    const group = getOrCreateGroup(target, key);
    for (const value of values) group.add(value);
  }
}

function normalizeGroups(groups: Readonly<Record<string, readonly string[]>>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(groups)
      .sort(([a], [b]) => compareStrings(a, b))
      .map(([key, values]) => [key, sortedUnique(values)])
  );
}

function freezeGroups(groups: ReadonlyMap<string, Set<string>>): Record<string, string[]> {
  return Object.fromEntries(
    [...groups.entries()].sort(([a], [b]) => compareStrings(a, b)).map(([key, values]) => [key, sortedUnique(values)])
  );
}

function packageName(source: string): string {
  if (!source.startsWith('@')) return source.split('/')[0]!;
  return source.split('/').slice(0, 2).join('/');
}

function graphPath(rootDir: string, fileName: string): string {
  return `./${relative(rootDir, fileName).split(sep).join('/').replaceAll('\\', '/')}`;
}

function isWithinRoot(rootDir: string, fileName: string): boolean {
  const path = relative(rootDir, fileName);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

function scriptKind(fileName: string): ts.ScriptKind {
  switch (extname(fileName)) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.js':
    case '.mjs':
    case '.cjs':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}

function sortedUnique(values: Iterable<string>): string[] {
  return [...new Set(values)].sort(compareStrings);
}

function sortMetadata(metadata: ArtifactMetadata): ArtifactMetadata {
  return sortMetadataValue(metadata) as ArtifactMetadata;
}

function sortMetadataValue(value: ArtifactMetadataValue): ArtifactMetadataValue {
  if (Array.isArray(value)) return value.map(sortMetadataValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => compareStrings(a, b))
        .map(([key, item]) => [key, sortMetadataValue(item)])
    );
  }
  return value;
}

function nodeDiagnostic(sourceFile: ts.SourceFile, node: ts.Node, code: string, message: string): CompilerDiagnostic {
  const location = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return errorDiagnostic(code, message, sourceFile.fileName, location.line + 1, location.character + 1);
}

function errorDiagnostic(
  code: string,
  message: string,
  file?: string,
  line?: number,
  column?: number
): CompilerDiagnostic {
  return {
    level: 'error',
    code,
    message,
    plugin: 'videojs/artifacts',
    ...(file ? { file } : {}),
    ...(line !== undefined ? { line } : {}),
    ...(column !== undefined ? { column } : {}),
  };
}

function sortDiagnostics(diagnostics: readonly CompilerDiagnostic[]): CompilerDiagnostic[] {
  return [...diagnostics].sort((a, b) => {
    return (
      compareStrings(a.file ?? '', b.file ?? '') ||
      (a.line ?? 0) - (b.line ?? 0) ||
      compareStrings(a.code, b.code) ||
      compareStrings(a.message, b.message)
    );
  });
}

function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
