import { isAbsolute, relative, resolve } from 'node:path';

import { parseSync } from 'oxc-parser';

import type { ComponentMeta } from '../components/meta';
import { moduleFilename } from '../utils/module-id';
import { escapesRoot, toPosixPath } from '../utils/path';
import type { ComponentGraph, ComponentGraphModule } from './types';

export interface ValidatedComponentGraphModule<
  Item extends ComponentMeta = ComponentMeta,
> extends ComponentGraphModule<Item> {
  readonly sourcePath: string;
}

export function validateComponentGraph<Item extends ComponentMeta>(
  graph: ComponentGraph<Item>
): ReadonlyMap<string, ValidatedComponentGraphModule<Item>> {
  if (!isAbsolute(graph.root)) throw new Error(`Component graph root must be absolute: \`${graph.root}\`.`);

  const root = resolve(graph.root);
  const modules = new Map<string, ValidatedComponentGraphModule<Item>>();

  for (const [key, module] of graph.modules) {
    if (key !== module.id) {
      throw new Error(`Component graph module must use its host ID as its map key: \`${module.id}\`.`);
    }

    if (!isAbsolute(module.filename)) {
      throw new Error(`Component graph module filename must be absolute: \`${module.filename}\`.`);
    }

    const filename = resolve(module.filename);
    const sourcePath = toPosixPath(relative(root, filename));

    if (!sourcePath || escapesRoot(sourcePath)) {
      throw new Error(`Component graph module must be inside the graph root: \`${module.filename}\`.`);
    }

    if (module.meta && !module.meta.name) {
      throw new Error(`Component graph module has an empty component name: \`${module.id}\`.`);
    }

    assertMetaRemoved(module);
    modules.set(module.id, { ...module, filename, sourcePath });
  }

  for (const module of modules.values()) {
    for (const graphImport of module.imports) {
      if (!graphImport.resolvedId || graph.modules.has(graphImport.resolvedId)) continue;

      const dependencyFilename = moduleFilename(graphImport.resolvedId);
      if (!isAbsolute(dependencyFilename)) continue;

      const dependencyPath = toPosixPath(relative(root, dependencyFilename));

      if (dependencyPath && !escapesRoot(dependencyPath)) {
        throw new Error(
          `Component graph dependency was not captured: \`${graphImport.specifier}\` from \`${module.id}\`.`
        );
      }
    }
  }

  return modules;
}

function assertMetaRemoved(module: ComponentGraphModule): void {
  const parsed = parseSync(module.filename, module.source);
  if (parsed.errors.length > 0) throw new Error(parsed.errors.map((error) => error.message).join('\n'));

  for (const statement of parsed.program.body) {
    if (
      statement.type === 'ExportNamedDeclaration' &&
      statement.declaration?.type === 'VariableDeclaration' &&
      statement.declaration.declarations.some(
        (declaration) => declaration.id.type === 'Identifier' && declaration.id.name === 'meta'
      )
    ) {
      throw new Error(`Component metadata remains in transformed source: \`${module.id}\`.`);
    }
  }
}
