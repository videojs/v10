import { isAbsolute, relative, resolve } from 'node:path';

import ts from 'typescript';

import type { ComponentMeta } from '../components/meta';
import { sourceScriptKind } from '../ts/utils/source-module';
import type { ImportReference } from './analyze';

export interface SourceImport extends ImportReference {
  readonly resolvedId?: string | undefined;
}

export interface SourceModule<Item extends ComponentMeta = ComponentMeta> {
  readonly id: string;
  readonly source: string;
  readonly imports: readonly SourceImport[];
  readonly meta?: Item | undefined;
}

export interface SourceGraph<Item extends ComponentMeta = ComponentMeta> {
  readonly root: string;
  readonly modules: ReadonlyMap<string, SourceModule<Item>>;
}

export interface RegistrySourceModule<Item extends ComponentMeta = ComponentMeta> extends SourceModule<Item> {
  readonly sourcePath: string;
}

export function validateSourceGraph(graph: SourceGraph): ReadonlyMap<string, RegistrySourceModule> {
  if (!isAbsolute(graph.root)) throw new Error(`Shadcn graph root must be absolute: \`${graph.root}\`.`);
  const root = resolve(graph.root);
  const modules = new Map<string, RegistrySourceModule>();

  for (const [key, module] of graph.modules) {
    if (!isAbsolute(module.id)) throw new Error(`Shadcn graph module ID must be absolute: \`${module.id}\`.`);
    const id = resolve(module.id);
    if (key !== module.id || id !== module.id) {
      throw new Error(`Shadcn graph module must use its resolved ID as its map key: \`${module.id}\`.`);
    }
    const sourcePath = toPosix(relative(root, id));
    if (!sourcePath || escapesRoot(sourcePath)) {
      throw new Error(`Shadcn graph module must be inside the graph root: \`${module.id}\`.`);
    }
    if (module.meta && !module.meta.name) {
      throw new Error(`Shadcn graph module has an empty component name: \`${module.id}\`.`);
    }
    assertMetaRemoved(module);
    if (modules.has(id)) throw new Error(`Shadcn graph module is captured twice: \`${id}\`.`);
    modules.set(id, { ...module, sourcePath });
  }

  return modules;
}

export function indexModulesByName(
  modules: ReadonlyMap<string, RegistrySourceModule>
): ReadonlyMap<string, RegistrySourceModule> {
  const indexed = new Map<string, RegistrySourceModule>();
  for (const module of modules.values()) {
    if (!module.meta) continue;
    const previous = indexed.get(module.meta.name);
    if (previous) {
      throw new Error(`Component \`${module.meta.name}\` is declared by both \`${previous.id}\` and \`${module.id}\`.`);
    }
    indexed.set(module.meta.name, module);
  }
  return indexed;
}

export function collectOwnedModules(
  root: RegistrySourceModule,
  modules: ReadonlyMap<string, RegistrySourceModule>,
  publishedNames: ReadonlySet<string>
): { modules: RegistrySourceModule[]; publishedDependencies: Set<string> } {
  const owned = new Map<string, RegistrySourceModule>();
  const publishedDependencies = new Set<string>();

  const visit = (module: RegistrySourceModule): void => {
    if (owned.has(module.id)) return;
    owned.set(module.id, module);

    for (const sourceImport of module.imports) {
      const dependency = sourceImport.resolvedId ? modules.get(sourceImport.resolvedId) : undefined;
      if (!dependency) continue;
      if (dependency.id !== root.id && dependency.meta && publishedNames.has(dependency.meta.name)) {
        publishedDependencies.add(dependency.meta.name);
      } else {
        visit(dependency);
      }
    }
  };

  visit(root);
  return { modules: [...owned.values()], publishedDependencies };
}

function assertMetaRemoved(module: SourceModule): void {
  const sourceFile = ts.createSourceFile(
    module.id,
    module.source,
    ts.ScriptTarget.Latest,
    true,
    sourceScriptKind(module.id)
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

function escapesRoot(path: string): boolean {
  return path === '..' || path.startsWith('../');
}

function toPosix(path: string): string {
  return path.replaceAll('\\', '/');
}
