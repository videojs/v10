import { DiagnosticError } from '../diagnostics';
import type { ArtifactMetadata, ArtifactResources, ArtifactSymbols } from './definition';
import { compareStrings, freezeGroups, mergeGroups, sortedUnique } from './groups';

export const ARTIFACT_GRAPH_VERSION = 1 as const;

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

export interface ArtifactClosure extends ArtifactDependencies {
  artifactIds: readonly string[];
  files: readonly ArtifactFile[];
  resources: ArtifactResources;
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
