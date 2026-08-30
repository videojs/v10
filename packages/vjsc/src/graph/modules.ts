import { extname, posix } from 'node:path';

import type { ModuleMeta } from '../components/meta';
import { replaceImportSpecifiers } from '../shadcn/analyze';
import type { GraphImport, GraphModule, VjscGraph } from './types';

export interface GraphImportContext<Meta extends ModuleMeta = ModuleMeta> {
  readonly dependency?: GraphModule<Meta> | undefined;
  readonly importer: GraphModule<Meta>;
  readonly reference: GraphImport;
}

/** Collect one root module and every captured graph dependency reachable from it. */
export function collectModules<Meta extends ModuleMeta>(graph: VjscGraph<Meta>, rootId: string): GraphModule<Meta>[] {
  const root = graph.modules.get(rootId);
  if (!root) throw new Error(`VJSC graph root module is missing: \`${rootId}\`.`);

  const collected = new Map<string, GraphModule<Meta>>();

  const visit = (module: GraphModule<Meta>): void => {
    if (collected.has(module.id)) return;

    collected.set(module.id, module);

    for (const reference of module.imports) {
      const dependency = reference.resolvedId ? graph.modules.get(reference.resolvedId) : undefined;

      if (dependency) visit(dependency);
    }
  };

  visit(root);
  return [...collected.values()];
}

/** Rewrite imports from the references already captured in a finalized component graph. */
export function rewriteImports<Meta extends ModuleMeta>(
  graph: VjscGraph<Meta>,
  module: GraphModule<Meta>,
  resolveImport: (context: GraphImportContext<Meta>) => string | undefined
): string {
  const replacements = module.imports.flatMap((reference) => {
    const dependency = reference.resolvedId ? graph.modules.get(reference.resolvedId) : undefined;
    const replacement = resolveImport({ dependency, importer: module, reference });

    return replacement && replacement !== reference.specifier ? [{ ...reference, replacement }] : [];
  });

  return replaceImportSpecifiers(module.source, replacements);
}

/** Build an extensionless relative module specifier between two generated module paths. */
export function relativeImport(importer: string, dependency: string): string {
  let path = posix.relative(posix.dirname(importer), dependency);

  if (/\.[cm]?[jt]sx?$/.test(path)) path = path.slice(0, -extname(path).length);

  return path.startsWith('.') ? path : `./${path}`;
}

/** Remove virtual stylesheet imports after their captured CSS has been emitted separately. */
export function stripStyleImports(source: string): string {
  return source.replace(/import\s+["']virtual:vjsc\/css\/[^"']+["'];?\s*/g, '').replace(/\n{3,}/g, '\n\n');
}
