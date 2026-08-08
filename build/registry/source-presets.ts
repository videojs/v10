import type { ArtifactGraph, ArtifactGraphNode } from '@videojs/compiler/artifacts';

export type RegistryFramework = 'html' | 'react';
export type RegistryStyle = 'css' | 'tailwind';
export type RegistryItemType = 'registry:block' | 'registry:component';
export type RegistryFileType = 'registry:component' | 'registry:file';

interface RegistryMetadata {
  title: string;
  description: string;
}

export interface RegistryTarget {
  framework: RegistryFramework;
  style: RegistryStyle;
}

export interface RegistryOutputFile {
  path: string;
  type: RegistryFileType;
  target?: string | undefined;
  content: string;
}

export interface RegistryOutputManifest {
  artifacts: Readonly<Record<string, readonly RegistryOutputFile[]>>;
  dependencies?: Readonly<Record<string, readonly string[]>> | undefined;
}

export interface RegistryCatalogItem {
  name: string;
  type: RegistryItemType;
  title: string;
  description: string;
  files: readonly RegistryOutputFile[];
  dependencies?: readonly string[] | undefined;
  registryDependencies?: readonly string[] | undefined;
  meta: {
    framework: RegistryFramework;
    style: RegistryStyle;
    ownership: 'source';
  };
}

export interface RegistryCatalog {
  $schema: 'https://ui.shadcn.com/schema/registry.json';
  name: 'videojs';
  homepage: 'https://videojs.org';
  items: readonly RegistryCatalogItem[];
}

export interface CreateRegistryCatalogOptions {
  target: RegistryTarget;
  output: RegistryOutputManifest;
  ref?: string | undefined;
  repository?: `${string}/${string}` | undefined;
}

export function createRegistryCatalog(
  graph: ArtifactGraph,
  { target, output, ref, repository = 'videojs/v10' }: CreateRegistryCatalogOptions
): RegistryCatalog {
  const artifacts = new Map(graph.artifacts.map((artifact) => [artifact.id, artifact]));
  const published = graph.artifacts.filter(
    (artifact) => hasRegistryMetadata(artifact) && isPublishedForTarget(artifact, target)
  );
  const publishedIds = new Set(published.map((artifact) => artifact.id));

  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'videojs',
    homepage: 'https://videojs.org',
    items: published.map((artifact) => {
      const { included, dependencies } = partitionDependencies(artifact, artifacts, publishedIds, target.framework);
      const files = uniqueFiles(
        included.flatMap((id) => {
          const artifactFiles = output.artifacts[id];
          if (!artifactFiles) throw new Error(`Registry output is missing artifact \`${id}\`.`);
          return artifactFiles;
        })
      );
      const registry = artifact.metadata.registry;
      const packageDependencies = [...new Set(included.flatMap((id) => output.dependencies?.[id] ?? []))].sort();

      return {
        name: itemName(target, artifact.id),
        type: artifact.kind === 'skin' ? 'registry:block' : 'registry:component',
        title: `${registry.title} (${frameworkTitle(target.framework)}, ${styleTitle(target.style)})`,
        description: `${registry.description} ${frameworkTitle(target.framework)} source with ${styleDescription(target.style)}.`,
        files,
        ...(packageDependencies.length ? { dependencies: packageDependencies } : {}),
        ...(dependencies.length
          ? {
              registryDependencies: dependencies.map(
                (id) => `${repository}/${itemName(target, id)}${ref ? `#${ref}` : ''}`
              ),
            }
          : {}),
        meta: {
          framework: target.framework,
          style: target.style,
          ownership: 'source',
        },
      };
    }),
  };
}

function isPublishedForTarget(artifact: ArtifactGraphNode, target: RegistryTarget): boolean {
  if (target.framework !== 'html') return true;
  return artifact.kind === 'skin' || artifact.kind === 'preset';
}

function hasRegistryMetadata(
  artifact: ArtifactGraphNode
): artifact is ArtifactGraphNode & { metadata: { registry: RegistryMetadata } } {
  const registry = artifact.metadata?.registry;
  return (
    typeof registry === 'object' &&
    registry !== null &&
    typeof registry.title === 'string' &&
    typeof registry.description === 'string'
  );
}

function partitionDependencies(
  root: ArtifactGraphNode,
  artifacts: ReadonlyMap<string, ArtifactGraphNode>,
  publishedIds: ReadonlySet<string>,
  framework: RegistryFramework
): { included: string[]; dependencies: string[] } {
  if (framework === 'html') return { included: [root.id], dependencies: [] };
  const included = new Set<string>();
  const dependencies = new Set<string>();

  const visit = (id: string): void => {
    if (id !== root.id && publishedIds.has(id)) {
      dependencies.add(id);
      return;
    }
    if (included.has(id)) return;
    included.add(id);

    const artifact = artifacts.get(id);
    if (!artifact) throw new Error(`Artifact \`${root.id}\` depends on missing artifact \`${id}\`.`);
    for (const dependency of artifact.dependencies.artifacts) visit(dependency);
  };

  visit(root.id);
  return { included: [...included].sort(), dependencies: [...dependencies].sort() };
}

function uniqueFiles(files: readonly RegistryOutputFile[]): RegistryOutputFile[] {
  const unique = new Map<string, RegistryOutputFile>();
  for (const file of files) {
    const key = `${file.path}\0${file.target ?? ''}`;
    const existing = unique.get(key);
    if (existing && existing.content !== file.content) {
      throw new Error(`Registry output collision: ${file.path}`);
    }
    unique.set(key, file);
  }
  return [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function itemName(target: RegistryTarget, artifactId: string): string {
  return `${target.framework}/${target.style}/${artifactId}`;
}

function frameworkTitle(framework: RegistryFramework): string {
  return framework === 'react' ? 'React' : 'HTML';
}

function styleTitle(style: RegistryStyle): string {
  return style === 'tailwind' ? 'Tailwind' : 'CSS';
}

function styleDescription(style: RegistryStyle): string {
  return style === 'tailwind' ? 'Tailwind styling' : 'vanilla CSS';
}
