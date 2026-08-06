import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { CompilerDiagnostic } from '../config';
import { type ArtifactDefinition, normalizeArtifactMetadata } from './definition';
import { diagnoseArtifactCycles, errorDiagnostic, nodeDiagnostic, sortDiagnostics } from './diagnostics';
import {
  ARTIFACT_GRAPH_VERSION,
  type ArtifactDependencies,
  type ArtifactFile,
  type ArtifactGraph,
  type ArtifactGraphNode,
} from './graph';
import {
  compareStrings,
  createMutableGroups,
  freezeGroups,
  getOrCreateGroup,
  type MutableGroups,
  normalizeGroups,
  sortedUnique,
} from './groups';
import {
  collectModuleReferences,
  graphPath,
  isSourceFile,
  isWithinRoot,
  packageNameFromSpecifier,
  parseArtifactSource,
  resolveImportedFile,
} from './source';

export interface BuildArtifactGraphOptions {
  rootDir: string;
  dependencyModules?: Readonly<Record<string, string>> | undefined;
  isArtifactEntry?: ((fileName: string) => boolean) | undefined;
}

export interface BuildArtifactGraphResult {
  graph: ArtifactGraph;
  diagnostics: readonly CompilerDiagnostic[];
}

interface NormalizedArtifactDefinition {
  definition: ArtifactDefinition;
  entryFile: string;
  entryPath: string;
}

interface MutableDependencies {
  artifacts: Set<string>;
  packages: Set<string>;
  symbols: MutableGroups;
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
      ...(artifact.definition.metadata ? { metadata: normalizeArtifactMetadata(artifact.definition.metadata) } : {}),
    });
  }

  nodes.sort((a, b) => compareStrings(a.id, b.id));
  diagnoseArtifactCycles(nodes, diagnostics);

  return {
    graph: { version: ARTIFACT_GRAPH_VERSION, artifacts: nodes },
    diagnostics: sortDiagnostics(diagnostics),
  };
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
  if (!isSourceFile(fileName)) return;

  const sourceFile = parseArtifactSource(fileName, sourceText);

  for (const reference of collectModuleReferences(sourceFile)) {
    if (!reference.source.startsWith('.')) {
      dependencies.packages.add(packageNameFromSpecifier(reference.source));
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
