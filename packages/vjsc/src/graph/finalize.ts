import { isAbsolute, relative, resolve } from 'node:path';

import { parseSync } from 'oxc-parser';

import type { ModuleMeta } from '../components/meta';
import { moduleFilename } from '../utils/module-id';
import { escapesRoot, toPosixPath } from '../utils/path';
import type { GraphModule, Graph } from './types';

export type GraphModuleInput<Node extends ModuleMeta = ModuleMeta> = Omit<GraphModule<Node>, 'sourcePath'>;

/** Normalize and validate the immutable graph exposed after the build has completed. */
export function finalizeGraph<Node extends ModuleMeta>(
  graphRoot: string,
  inputs: readonly GraphModuleInput<Node>[],
  graphAssets: ReadonlyMap<string, string>
): Graph<Node> {
  if (!isAbsolute(graphRoot)) throw new Error(`VJSC graph root must be absolute: \`${graphRoot}\`.`);

  const root = resolve(graphRoot);
  const modules = new Map<string, GraphModule<Node>>();

  for (const input of inputs) {
    if (modules.has(input.id)) throw new Error(`VJSC graph module is captured twice: \`${input.id}\`.`);

    if (!isAbsolute(input.filename)) {
      throw new Error(`VJSC graph module filename must be absolute: \`${input.filename}\`.`);
    }

    const filename = resolve(input.filename);
    const sourcePath = toPosixPath(relative(root, filename));

    if (!sourcePath || escapesRoot(sourcePath)) {
      throw new Error(`VJSC graph module must be inside the graph root: \`${input.filename}\`.`);
    }

    if (input.meta && 'name' in input.meta && input.meta.name === '') {
      throw new Error(`VJSC graph module has an empty name: \`${input.id}\`.`);
    }

    assertMetaRemoved(input);
    modules.set(input.id, { ...input, filename, sourcePath });
  }

  for (const module of modules.values()) {
    for (const graphImport of module.imports) {
      if (!graphImport.resolvedId || modules.has(graphImport.resolvedId)) continue;

      const dependencyFilename = moduleFilename(graphImport.resolvedId);
      if (!isAbsolute(dependencyFilename)) continue;

      const dependencyPath = toPosixPath(relative(root, dependencyFilename));

      if (dependencyPath && !escapesRoot(dependencyPath)) {
        throw new Error(`VJSC graph dependency was not captured: \`${graphImport.specifier}\` from \`${module.id}\`.`);
      }
    }
  }

  return { root, modules, assets: new Map(graphAssets) };
}

function assertMetaRemoved(module: GraphModuleInput): void {
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
      throw new Error(`Module metadata remains in transformed source: \`${module.id}\`.`);
    }
  }
}
