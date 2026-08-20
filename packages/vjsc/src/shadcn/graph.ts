import { isAbsolute, relative, resolve } from 'node:path';

import ts from 'typescript';

import type { ComponentMeta } from '../components/meta';
import { sourceScriptKind } from '../ts/utils/source-module';
import type { ImportReference } from './analyze';
import type { ShadcnItem, ShadcnVariant } from './types';

export interface SourceImport extends ImportReference {
  readonly resolvedId?: string | undefined;
}

export interface SourceModule<Item extends ComponentMeta = ComponentMeta> {
  readonly id: string;
  readonly filename: string;
  readonly source: string;
  readonly imports: readonly SourceImport[];
  readonly meta?: Item | undefined;
  readonly variant?: ShadcnVariant | undefined;
}

export interface SourceGraph<Item extends ComponentMeta = ComponentMeta> {
  readonly root: string;
  readonly modules: ReadonlyMap<string, SourceModule<Item>>;
}

export interface RegistrySourceModule<Item extends ComponentMeta = ComponentMeta> extends SourceModule<Item> {
  readonly sourcePath: string;
}

export interface PublishedModule<Item extends ComponentMeta = ComponentMeta> {
  readonly module: RegistrySourceModule<Item>;
  readonly item: ShadcnItem;
}

export function validateSourceGraph<Item extends ComponentMeta>(
  graph: SourceGraph<Item>
): ReadonlyMap<string, RegistrySourceModule<Item>> {
  if (!isAbsolute(graph.root)) throw new Error(`Shadcn graph root must be absolute: \`${graph.root}\`.`);
  const root = resolve(graph.root);
  const modules = new Map<string, RegistrySourceModule<Item>>();

  for (const [key, module] of graph.modules) {
    if (key !== module.id)
      throw new Error(`Shadcn graph module must use its host ID as its map key: \`${module.id}\`.`);
    if (!isAbsolute(module.filename)) {
      throw new Error(`Shadcn graph module filename must be absolute: \`${module.filename}\`.`);
    }
    const filename = resolve(module.filename);
    const sourcePath = toPosix(relative(root, filename));
    if (!sourcePath || escapesRoot(sourcePath)) {
      throw new Error(`Shadcn graph module must be inside the graph root: \`${module.filename}\`.`);
    }
    if (module.meta && !module.meta.name) {
      throw new Error(`Shadcn graph module has an empty component name: \`${module.id}\`.`);
    }
    assertMetaRemoved(module);
    modules.set(module.id, { ...module, filename, sourcePath });
  }

  for (const module of modules.values()) {
    for (const sourceImport of module.imports) {
      if (!sourceImport.resolvedId) continue;
      const dependency = graph.modules.get(sourceImport.resolvedId);
      if (dependency) continue;
      const dependencyFilename = cleanId(sourceImport.resolvedId);
      if (!isAbsolute(dependencyFilename)) continue;
      const dependencyPath = toPosix(relative(root, dependencyFilename));
      if (dependencyPath && !escapesRoot(dependencyPath)) {
        throw new Error(
          `Shadcn source dependency was not captured: \`${sourceImport.specifier}\` from \`${module.id}\`.`
        );
      }
    }
  }

  return modules;
}

export function collectOwnedModules<Item extends ComponentMeta>(
  root: RegistrySourceModule<Item>,
  modules: ReadonlyMap<string, RegistrySourceModule<Item>>,
  published: ReadonlyMap<string, PublishedModule<Item>>
): { modules: RegistrySourceModule<Item>[]; publishedDependencies: Set<string> } {
  const owned = new Map<string, RegistrySourceModule<Item>>();
  const publishedDependencies = new Set<string>();

  const visit = (module: RegistrySourceModule<Item>): void => {
    if (owned.has(module.id)) return;
    owned.set(module.id, module);

    for (const sourceImport of module.imports) {
      const dependency = sourceImport.resolvedId ? modules.get(sourceImport.resolvedId) : undefined;
      if (!dependency) continue;
      const dependencyItem = published.get(dependency.id);
      if (dependency.id !== root.id && dependencyItem) publishedDependencies.add(dependencyItem.item.name);
      else visit(dependency);
    }
  };

  visit(root);
  return { modules: [...owned.values()], publishedDependencies };
}

function assertMetaRemoved(module: SourceModule): void {
  const sourceFile = ts.createSourceFile(
    module.filename,
    module.source,
    ts.ScriptTarget.Latest,
    true,
    sourceScriptKind(module.filename)
  );
  for (const statement of sourceFile.statements) {
    if (
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) &&
      statement.declarationList.declarations.some(
        (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === 'meta'
      )
    ) {
      throw new Error(`Component metadata remains in transformed Shadcn source: \`${module.id}\`.`);
    }
  }
}

function cleanId(id: string): string {
  const queryIndex = id.indexOf('?');
  return queryIndex === -1 ? id : id.slice(0, queryIndex);
}

function escapesRoot(path: string): boolean {
  return path === '..' || path.startsWith('../');
}

function toPosix(path: string): string {
  return path.replaceAll('\\', '/');
}
