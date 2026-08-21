import { createHash } from 'node:crypto';

import type { ImportDeclaration, JSXElement, JSXElementName, Program } from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { Plugin } from 'rolldown';

import { createSourceText, jsxNamePath, type ModuleImports, renderSourceRange, type SourceEdit } from '../ast';
import type { ComponentDefinition, ComponentRecord } from '../components/definition';
import {
  type ComponentRewrite,
  type ComponentRewriteContext,
  type ComponentTarget,
  type ComponentTargetPath,
  type ComponentTargetRule,
  isTargetElement,
  type PrimitiveTargetRule,
  type SourcePart,
  type SourcePartCollection,
  type SourcePartFor,
  type TargetOutput,
} from '../target/definition';
import { createTargetModuleImports } from '../target/module-imports';
import { renderTargetElement, renderTargetOutput } from '../target/render';
import { createSourceChildren, createSourceProps, singleJsxElementChild } from '../target/source';
import { type ParsedModuleId, parseModuleId } from '../utils/module-id';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;

export interface ComponentTargetModule extends ParsedModuleId {
  readonly id: string;
}

export type ComponentTargetSelection =
  | readonly ComponentTarget[]
  | ((module: ComponentTargetModule) => readonly ComponentTarget[] | null | undefined);

export interface ComponentTargetPluginOptions {
  readonly targets: ComponentTargetSelection;
}

interface CanonicalPath {
  readonly target: ComponentTarget;
  readonly component: string;
  readonly part: string | null;
}

interface CanonicalBindings {
  readonly namespaces: ReadonlyMap<string, ComponentTarget>;
  readonly named: ReadonlyMap<string, CanonicalPath>;
}

interface ComponentSourceScope {
  readonly root: JSXElement;
  readonly target: ComponentTarget;
  readonly prefix: string;
  used: boolean;
}

interface ComponentSourceScopes {
  readonly nodes: ReadonlyMap<JSXElement, ComponentSourceScope>;
}

type RuntimeComponentDefinition = ComponentDefinition<object, ComponentRecord | undefined>;
type RuntimeSourceParts = ComponentRewriteContext<RuntimeComponentDefinition>['parts'];
type RuntimeSourcePart = SourcePartFor<RuntimeComponentDefinition>;

export function componentTargetPlugin(options: ComponentTargetPluginOptions): Plugin {
  return {
    name: 'vjsc:component-target',
    transform: {
      filter: { id: SCRIPT_ID, code: '<' },
      handler(code, id, transform) {
        const targets = selectComponentTargets(options.targets, id);
        if (targets.length === 0 || !transform.ast || !transform.magicString) return null;

        const bindings = collectCanonicalBindings(transform.ast, targets);
        if (bindings.namespaces.size === 0 && bindings.named.size === 0) return null;

        const scopes = collectComponentScopes(transform.ast, bindings, id);
        const imports = createTargetModuleImports(transform.ast, transform.magicString);
        const descendants = new Map<JSXElement, readonly SourceEdit[]>();
        const edits = collectJsxEdits(transform.ast, descendants, (node, childEdits) => {
          const path = canonicalPath(node.openingElement.name, bindings);
          if (!path) return childEdits;

          const scope = scopes.nodes.get(node);
          if (!scope) throw new Error('Component target could not resolve the source component scope.');

          const rule = configuredRule(path) ?? resolveDefault(path);

          if (typeof rule === 'function' && !isTargetElement(rule)) {
            const source = createSourceText(code, childEdits);
            const children = createSourceChildren(
              source,
              node.openingElement,
              node.closingElement?.start ?? node.openingElement.end,
              singleJsxElementChild(node)?.openingElement
            );
            const context: ComponentRewriteContext<RuntimeComponentDefinition> = {
              props: createSourceProps(source, node.openingElement, children),
              children: children as unknown as TargetOutput,
              parts: createSourceParts(code, node, path, bindings, scopes, descendants),
              id: (name) => sourceId(scope, name),
            };
            const output = (rule as ComponentRewrite<RuntimeComponentDefinition>)(context);
            let replacement = renderTargetOutput(output, { target: path.target, imports });

            if (scope.root === node && scope.used) replacement = renderSourceScope(replacement, scope, imports);

            return [{ start: node.start, end: node.end, content: replacement }];
          }

          const targetElement = isTargetElement(rule) ? rule : undefined;
          const nodeEdits = [...childEdits];

          if (targetElement) {
            const name = renderTargetElement(targetElement, { target: path.target, imports });

            nodeEdits.push({
              start: node.openingElement.name.start,
              end: node.openingElement.name.end,
              content: name,
            });

            if (node.closingElement) {
              nodeEdits.push({
                start: node.closingElement.name.start,
                end: node.closingElement.name.end,
                content: name,
              });
            }
          }

          return wrapSourceScope(code, node, nodeEdits, scope, imports);
        });
        if (edits.length === 0) return null;

        for (const edit of edits) transform.magicString.overwrite(edit.start, edit.end, edit.content);

        imports.commit();
        return { code: transform.magicString };
      },
    },
  };
}

export function primitiveTargetPlugin(options: ComponentTargetPluginOptions): Plugin {
  return {
    name: 'vjsc:primitive-target',
    transform: {
      filter: { id: SCRIPT_ID, code: '<' },
      handler(code, id, transform) {
        const targets = selectComponentTargets(options.targets, id);
        if (targets.length === 0 || !transform.ast || !transform.magicString) return null;

        const bindings = collectPrimitiveBindings(transform.ast, targets);
        if (bindings.size === 0) return null;

        const imports = createTargetModuleImports(transform.ast, transform.magicString);
        let occurrence = 0;
        const edits = collectJsxEdits(transform.ast, new Map(), (node, childEdits) => {
          const path = jsxNamePath(node.openingElement.name);
          const binding = path.length === 1 ? bindings.get(path[0]!) : undefined;
          if (!binding) return childEdits;

          const source = createSourceText(code, childEdits);
          const children = createSourceChildren(
            source,
            node.openingElement,
            node.closingElement?.start ?? node.openingElement.end
          );
          const rule = binding.rule;

          if (typeof rule === 'function' && !isTargetElement(rule)) {
            const output = rule({
              props: createSourceProps(source, node.openingElement, children),
              children: children as unknown as TargetOutput,
              id: (name) => `vjsc-${binding.name.toLowerCase()}-${occurrence}-${name}`,
            });
            const replacement = renderTargetOutput(output, { target: binding.target, imports });

            occurrence += 1;
            return [{ start: node.start, end: node.end, content: replacement }];
          }

          if (!isTargetElement(rule)) return childEdits;

          const name = renderTargetElement(rule, { target: binding.target, imports });
          const nodeEdits = [
            ...childEdits,
            { start: node.openingElement.name.start, end: node.openingElement.name.end, content: name },
          ];

          if (node.closingElement) {
            nodeEdits.push({
              start: node.closingElement.name.start,
              end: node.closingElement.name.end,
              content: name,
            });
          }

          return nodeEdits;
        });
        if (edits.length === 0) return null;

        for (const edit of edits) transform.magicString.overwrite(edit.start, edit.end, edit.content);

        imports.commit();
        return { code: transform.magicString };
      },
    },
  };
}

export function selectComponentTargets(selection: ComponentTargetSelection, id: string): readonly ComponentTarget[] {
  if (typeof selection !== 'function') return selection;

  const parsed = parseModuleId(id);

  return selection({ id, ...parsed }) ?? [];
}

function collectCanonicalBindings(ast: Program, targets: readonly ComponentTarget[]): CanonicalBindings {
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

    collectImportBindings(statement, bySource, namespaces, named);
  }

  return { namespaces, named };
}

function collectComponentScopes(ast: Program, bindings: CanonicalBindings, id: string): ComponentSourceScopes {
  const nodes = new Map<JSXElement, ComponentSourceScope>();
  const stack: { readonly path: CanonicalPath; readonly scope: ComponentSourceScope }[] = [];
  const moduleKey = createHash('sha256').update(id).digest('base64url').slice(0, 8);

  walk(ast, {
    enter(node) {
      if (node.type !== 'JSXElement') return;

      const path = canonicalPath(node.openingElement.name, bindings);
      if (!path) return;

      const isRoot = path.part === null || path.part === 'Root';
      const owner = isRoot ? undefined : enclosingScope(stack, path);
      const scope: ComponentSourceScope = owner ?? {
        root: node,
        target: path.target,
        prefix: `${moduleKey}-${node.start.toString(36)}`,
        used: false,
      };

      nodes.set(node, scope);

      if (isRoot || !owner) stack.push({ path, scope });
    },
    leave(node) {
      if (node.type !== 'JSXElement') return;

      const scope = nodes.get(node);

      if (scope?.root === node) stack.pop();
    },
  });

  return { nodes };
}

function enclosingScope(
  stack: readonly { readonly path: CanonicalPath; readonly scope: ComponentSourceScope }[],
  path: CanonicalPath
): ComponentSourceScope | undefined {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const entry = stack[index]!;
    if (entry.path.target === path.target && entry.path.component === path.component) return entry.scope;
  }

  return undefined;
}

function collectPrimitiveBindings(
  ast: Program,
  targets: readonly ComponentTarget[]
): ReadonlyMap<
  string,
  { readonly name: string; readonly rule: PrimitiveTargetRule<object>; readonly target: ComponentTarget }
> {
  const bindings = new Map<
    string,
    { readonly name: string; readonly rule: PrimitiveTargetRule<object>; readonly target: ComponentTarget }
  >();

  for (const statement of ast.body) {
    if (
      statement.type !== 'ImportDeclaration' ||
      statement.importKind === 'type' ||
      statement.source.value !== 'vjsc/components'
    ) {
      continue;
    }

    for (const specifier of statement.specifiers) {
      if (specifier.type !== 'ImportSpecifier' || specifier.importKind === 'type') continue;

      const name = specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
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

function collectImportBindings(
  declaration: ImportDeclaration,
  targets: ReadonlyMap<string, ComponentTarget>,
  namespaces: Map<string, ComponentTarget>,
  named: Map<string, CanonicalPath>
): void {
  const target = targets.get(declaration.source.value);
  if (!target) return;

  for (const specifier of declaration.specifiers) {
    if (specifier.type === 'ImportNamespaceSpecifier') {
      namespaces.set(specifier.local.name, target);
    } else if (specifier.type === 'ImportSpecifier' && specifier.importKind !== 'type') {
      const component = specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;

      named.set(specifier.local.name, { target, component, part: null });
    }
  }
}

function canonicalPath(name: JSXElementName, bindings: CanonicalBindings): CanonicalPath | undefined {
  const path = jsxNamePath(name);
  if (path.length === 0) return undefined;

  const namespace = bindings.namespaces.get(path[0]!);

  if (namespace && path.length > 1) {
    return {
      target: namespace,
      component: path[1]!,
      part: path.length > 2 ? path.slice(2).join('.') : null,
    };
  }

  const named = bindings.named.get(path[0]!);
  if (!named) return undefined;

  return {
    ...named,
    part: path.length > 1 ? path.slice(1).join('.') : null,
  };
}

function configuredRule(path: CanonicalPath): ComponentTargetRule<object> | undefined {
  let rule = path.target.components[path.component] as ComponentTargetRule<object> | undefined;
  if (!path.part || !rule) return rule;

  const parts = path.part.split('.');

  for (const [index, part] of parts.entries()) {
    if (!rule) return undefined;

    if (typeof rule === 'function' || isTargetElement(rule)) {
      return part === 'Root' && index === parts.length - 1 ? rule : undefined;
    }

    rule = (rule as Readonly<Record<string, ComponentTargetRule<object> | undefined>>)[part];
  }

  return rule;
}

function resolveDefault(path: CanonicalPath): ComponentTargetRule<object> | undefined {
  const targetPath: ComponentTargetPath = { component: path.component, part: path.part };

  return path.target.resolve(targetPath) as ComponentTargetRule<object> | undefined;
}

interface CollectedPart {
  readonly value: SourcePart<object>;
  readonly children: Map<string, CollectedPartGroup>;
}

interface CollectedPartGroup {
  readonly values: CollectedPart[];
  readonly children: Map<string, CollectedPartGroup>;
}

function createSourceParts(
  code: string,
  root: JSXElement,
  rootPath: CanonicalPath,
  bindings: CanonicalBindings,
  scopes: ComponentSourceScopes,
  descendants: ReadonlyMap<JSXElement, readonly SourceEdit[]>
): RuntimeSourceParts {
  const groups = new Map<string, CollectedPartGroup>();
  const rootScope = scopes.nodes.get(root);

  walk(root, {
    enter(node) {
      if (node === root || node.type !== 'JSXElement') return;

      const path = canonicalPath(node.openingElement.name, bindings);
      if (!path || path.target !== rootPath.target || path.component !== rootPath.component || !path.part) return;

      if (scopes.nodes.get(node) !== rootScope) {
        this.skip();
        return;
      }

      const names = path.part.split('.');
      let current = groups;
      let group: CollectedPartGroup | undefined;

      for (const name of names) {
        group = current.get(name);

        if (!group) {
          group = { values: [], children: new Map() };
          current.set(name, group);
        }

        current = group.children;
      }

      const source = createSourceText(code, descendants.get(node) ?? []);
      const children = createSourceChildren(
        source,
        node.openingElement,
        node.closingElement?.start ?? node.openingElement.end,
        singleJsxElementChild(node)?.openingElement
      );

      group!.values.push({
        value: {
          props: createSourceProps(source, node.openingElement, children),
          children: children as unknown as TargetOutput,
        },
        children: group!.children,
      });
    },
  });

  return Object.fromEntries([...groups].map(([name, group]) => [name, sourcePartCollection(name, group)]));
}

function sourcePartCollection(name: string, group: CollectedPartGroup): RuntimeSourcePart {
  const collection = {
    one() {
      if (group.values.length !== 1) {
        throw new Error(`Component rewrite expected one <${name}> part, found ${group.values.length}.`);
      }

      return group.values[0]!.value;
    },
    all() {
      return group.values.map((item) => item.value);
    },
  } as unknown as SourcePartCollection<object> & Record<string, RuntimeSourcePart>;

  Object.defineProperties(collection, {
    props: { enumerable: true, get: () => collection.one().props },
    children: { enumerable: true, get: () => collection.one().children },
  });

  for (const [childName, child] of group.children) {
    collection[childName] = sourcePartCollection(`${name}.${childName}`, child);
  }

  return collection;
}

function sourceId(scope: ComponentSourceScope, name: string): string {
  if (!/^[A-Za-z][A-Za-z0-9-]*$/.test(name)) {
    throw new Error('Target identifier names must start with a letter and contain only letters, numbers, or dashes.');
  }

  scope.used = true;
  return scope.target.jsx.scope ? `__vjsc-id-${scope.prefix}-${name}` : `vjsc-${scope.prefix}-${name}`;
}

function renderSourceScope(source: string, scope: ComponentSourceScope, imports: ModuleImports): string {
  const runtime = scope.target.jsx.scope;
  if (!runtime) return source;

  const name = imports.reference(runtime);

  return `<${name} prefix=${JSON.stringify(scope.prefix)}>${source}</${name}>`;
}

function wrapSourceScope(
  code: string,
  node: JSXElement,
  edits: readonly SourceEdit[],
  scope: ComponentSourceScope,
  imports: ModuleImports
): readonly SourceEdit[] {
  if (scope.root !== node || !scope.used || !scope.target.jsx.scope) return edits;

  const source = renderSourceRange(createSourceText(code, edits), node.start, node.end).value;

  return [{ start: node.start, end: node.end, content: renderSourceScope(source, scope, imports) }];
}

function collectJsxEdits(
  ast: Program,
  descendants: Map<JSXElement, readonly SourceEdit[]>,
  transform: (node: JSXElement, descendants: readonly SourceEdit[]) => readonly SourceEdit[]
): SourceEdit[] {
  const pending = new Map<JSXElement, SourceEdit[]>();
  const roots: SourceEdit[] = [];
  const stack: JSXElement[] = [];

  walk(ast, {
    enter(node) {
      if (node.type !== 'JSXElement') return;

      stack.push(node);
      pending.set(node, []);
    },
    leave(node) {
      if (node.type !== 'JSXElement') return;

      if (stack.pop() !== node) throw new Error('vjsc: JSX traversal stack became unbalanced.');

      const childEdits = pending.get(node) ?? [];

      descendants.set(node, childEdits);
      const edits = transform(node, childEdits);
      const parent = stack.at(-1);

      if (parent) pending.get(parent)!.push(...edits);
      else roots.push(...edits);
    },
  });

  return roots.sort((left, right) => left.start - right.start);
}

function primitiveRule(target: ComponentTarget, name: string): PrimitiveTargetRule<object> | undefined {
  return (target.primitives as Readonly<Record<string, PrimitiveTargetRule<object> | undefined>>)[name];
}
