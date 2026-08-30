import { extname, posix } from 'node:path';

import type { NamedModuleMeta } from '../components/meta';
import { replaceImportSpecifiers } from '../shadcn/analyze';
import type { ComponentGraph, ComponentGraphImport } from './types';
import { type ValidatedComponentGraphModule, validateComponentGraph } from './validate';

export interface ComponentGraphImportContext<Item extends NamedModuleMeta = NamedModuleMeta> {
  readonly dependency?: ValidatedComponentGraphModule<Item> | undefined;
  readonly importer: ValidatedComponentGraphModule<Item>;
  readonly reference: ComponentGraphImport;
}

/** Collect one root module and every captured graph dependency reachable from it. */
export function collectComponentGraphModules<Item extends NamedModuleMeta>(
  graph: ComponentGraph<Item>,
  rootId: string
): ValidatedComponentGraphModule<Item>[] {
  const modules = validateComponentGraph(graph);
  const root = modules.get(rootId);
  if (!root) throw new Error(`Component graph root module is missing: \`${rootId}\`.`);

  const collected = new Map<string, ValidatedComponentGraphModule<Item>>();

  const visit = (module: ValidatedComponentGraphModule<Item>): void => {
    if (collected.has(module.id)) return;

    collected.set(module.id, module);

    for (const reference of module.imports) {
      const dependency = reference.resolvedId ? modules.get(reference.resolvedId) : undefined;

      if (dependency) visit(dependency);
    }
  };

  visit(root);
  return [...collected.values()];
}

/** Rewrite imports from the references already captured in a finalized component graph. */
export function rewriteComponentGraphImports<Item extends NamedModuleMeta>(
  graph: ComponentGraph<Item>,
  module: ValidatedComponentGraphModule<Item>,
  resolveImport: (context: ComponentGraphImportContext<Item>) => string | undefined
): string {
  const modules = validateComponentGraph(graph);
  const replacements = module.imports.flatMap((reference) => {
    const dependency = reference.resolvedId ? modules.get(reference.resolvedId) : undefined;
    const replacement = resolveImport({ dependency, importer: module, reference });

    return replacement && replacement !== reference.specifier ? [{ ...reference, replacement }] : [];
  });

  return replaceImportSpecifiers(module.source, replacements);
}

/** Build an extensionless relative module specifier between two generated module paths. */
export function relativeComponentGraphImport(importer: string, dependency: string): string {
  let path = posix.relative(posix.dirname(importer), dependency);

  if (/\.[cm]?[jt]sx?$/.test(path)) path = path.slice(0, -extname(path).length);

  return path.startsWith('.') ? path : `./${path}`;
}

/** Remove virtual stylesheet imports after their captured CSS has been emitted separately. */
export function stripComponentGraphStyleImports(source: string): string {
  return source.replace(/import\s+["']virtual:vjsc\/css\/[^"']+["'];?\s*/g, '').replace(/\n{3,}/g, '\n\n');
}
