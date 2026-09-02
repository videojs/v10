import type { ImportDeclaration, JSXElementName, Program } from '@oxc-project/types';

import { jsxNamePath } from '../ast/traverse';
import {
  type ComponentPath,
  type ComponentRule,
  type ComponentTarget,
  isTargetElement,
  type PrimitiveTargetRule,
} from './definition';

/** Module specifier of the authoring runtime whose primitives and types targets lower. */
export const COMPONENT_SOURCE = 'vjsc/components';

/** A canonical component or part reached through a target's source import. */
export interface CanonicalPath {
  readonly target: ComponentTarget;
  readonly component: string;
  readonly part: string | null;
}

/** Local bindings a module holds for canonical component sources. */
export interface CanonicalBindings {
  /** Namespace imports such as `import * as $ from '@videojs/core/vjsc'`. */
  readonly namespaces: ReadonlyMap<string, ComponentTarget>;
  /** Named imports such as `import { Menu } from '@videojs/core/vjsc'`. */
  readonly named: ReadonlyMap<string, CanonicalPath>;
}

/** A local binding for a `vjsc/components` primitive owned by exactly one target. */
export interface PrimitiveBinding {
  readonly name: string;
  readonly rule: PrimitiveTargetRule<object>;
  readonly target: ComponentTarget;
}

/** Collect the module's canonical component bindings for the selected targets. */
export function collectCanonicalBindings(ast: Program, targets: readonly ComponentTarget[]): CanonicalBindings {
  const bySource = new Map<string, ComponentTarget>();
  const namespaces = new Map<string, ComponentTarget>();
  const named = new Map<string, CanonicalPath>();

  for (const target of targets) {
    if (bySource.has(target.source)) {
      throw new Error(`More than one component target was provided for \`${target.source}\`.`);
    }

    bySource.set(target.source, target);
  }

  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type') continue;

    const target = bySource.get(statement.source.value);
    if (!target) continue;

    for (const specifier of statement.specifiers) {
      if (specifier.type === 'ImportNamespaceSpecifier') {
        namespaces.set(specifier.local.name, target);
      } else if (specifier.type === 'ImportSpecifier' && specifier.importKind !== 'type') {
        named.set(specifier.local.name, { target, component: importedName(specifier), part: null });
      }
    }
  }

  return { namespaces, named };
}

/** Collect the module's runtime primitive imports from `vjsc/components` that a selected target owns. */
export function collectPrimitiveBindings(
  ast: Program,
  targets: readonly ComponentTarget[]
): ReadonlyMap<string, PrimitiveBinding> {
  const bindings = new Map<string, PrimitiveBinding>();

  for (const statement of ast.body) {
    if (!isComponentImport(statement)) continue;

    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier' || specifier.importKind === 'type') continue;

      const name = importedName(specifier);
      if (name === 'Template') continue;

      const owners = targets.flatMap((target) => {
        const rule = primitiveRule(target, name);

        return rule ? [{ target, rule }] : [];
      });
      if (owners.length > 1) throw new Error(`More than one component target defines the \`${name}\` primitive.`);

      if (owners[0]) bindings.set(specifier.local.name, { name, ...owners[0] });
    }
  }

  return bindings;
}

/** Whether a statement is a runtime import from `vjsc/components`. */
export function isComponentImport(statement: Program['body'][number]): statement is ImportDeclaration {
  return (
    statement.type === 'ImportDeclaration' &&
    statement.importKind !== 'type' &&
    statement.source.value === COMPONENT_SOURCE
  );
}

/** Resolve a JSX element name such as `$.Menu.Trigger` or `Menu.Trigger` to its canonical path. */
export function canonicalPath(name: JSXElementName, bindings: CanonicalBindings): CanonicalPath | undefined {
  return boundCanonicalPath(jsxNamePath(name), bindings);
}

/** Resolve an identifier path such as `['$', 'Menu', 'Trigger']` to its canonical path. */
export function boundCanonicalPath(path: readonly string[], bindings: CanonicalBindings): CanonicalPath | undefined {
  if (path.length === 0) return undefined;

  const namespace = bindings.namespaces.get(path[0]!);

  if (namespace && path.length > 1) {
    return { target: namespace, component: path[1]!, part: path.length > 2 ? path.slice(2).join('.') : null };
  }

  const named = bindings.named.get(path[0]!);

  return named ? { ...named, part: path.length > 1 ? path.slice(1).join('.') : null } : undefined;
}

/** The explicit rule a target configured for a canonical path, if any. */
export function configuredRule(path: CanonicalPath): ComponentRule<object> | undefined {
  let rule = path.target.components.rules[path.component] as ComponentRule<object> | undefined;
  if (!path.part || !rule) return rule;

  const parts = path.part.split('.');

  for (const [index, part] of parts.entries()) {
    if (!rule) return undefined;

    if (typeof rule === 'function' || isTargetElement(rule)) {
      return part === 'Root' && index === parts.length - 1 ? rule : undefined;
    }

    rule = (rule as Readonly<Record<string, ComponentRule<object> | undefined>>)[part];
  }

  return rule;
}

/** The target's conventional rule for a canonical path. */
export function resolveDefault(path: CanonicalPath): ComponentRule<object> | undefined {
  const targetPath: ComponentPath = { component: path.component, part: path.part };

  return path.target.components.resolve(targetPath) as ComponentRule<object> | undefined;
}

/** The imported name of an import specifier, ignoring any local alias. */
export function importedName(specifier: ImportDeclaration['specifiers'][number]): string {
  if (specifier.type !== 'ImportSpecifier') return specifier.local.name;

  return specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
}

/** The primitive rule a target defines for a `vjsc/components` export. */
export function primitiveRule(target: ComponentTarget, name: string): PrimitiveTargetRule<object> | undefined {
  return (target.primitives as Readonly<Record<string, PrimitiveTargetRule<object> | undefined>>)[name];
}
