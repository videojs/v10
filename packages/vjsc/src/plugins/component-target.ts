import { createHash } from 'node:crypto';

import type { JSXElement, Program } from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { Plugin } from 'rolldown';

import { createSourceText, jsxNamePath, type ModuleImports, renderSourceRange, type SourceEdit } from '../ast';
import type { ComponentPartDefinition, ComponentParts } from '../components/definition';
import {
  type CanonicalBindings,
  type CanonicalPath,
  canonicalPath,
  collectCanonicalBindings,
  collectPrimitiveBindings,
  configuredRule,
  resolveDefault,
} from '../target/bindings';
import {
  type ComponentRewrite,
  type ComponentRewriteContext,
  type ComponentTarget,
  isTargetUnwrap,
  isTargetElement,
  type SourcePart,
  type SourcePartCollection,
  type SourcePartFor,
  type TargetOutput,
} from '../target/definition';
import { createTargetModuleImports } from '../target/module-imports';
import { renderTargetElement, renderTargetOutput } from '../target/render';
import {
  createSourceChildren,
  createSourceProps,
  createTargetReplacement,
  singleJsxElementChild,
} from '../target/source';
import { parseModuleId, type TransformModule, SCRIPT_MODULE_ID } from '../utils/module-id';

export type ComponentTargetSelection =
  | readonly ComponentTarget[]
  | ((module: TransformModule) => readonly ComponentTarget[] | null | undefined);

export interface ComponentTargetPluginOptions {
  readonly targets: ComponentTargetSelection;
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

type RuntimeComponentDefinition = ComponentPartDefinition<object, ComponentParts | undefined>;
type RuntimeSourceParts = ComponentRewriteContext<RuntimeComponentDefinition>['parts'];
type RuntimeSourcePart = SourcePartFor<RuntimeComponentDefinition>;

export function componentTargetPlugin(options: ComponentTargetPluginOptions): Plugin {
  return {
    name: 'vjsc:component-target',
    transform: {
      filter: { id: SCRIPT_MODULE_ID, code: '<' },
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

          if (isUnwrappedRoot(path)) {
            const edits = [
              ...childEdits,
              { start: node.openingElement.start, end: node.openingElement.end, content: '' },
            ];

            if (node.closingElement) {
              edits.push({ start: node.closingElement.start, end: node.closingElement.end, content: '' });
            }

            return edits;
          }

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
      filter: { id: SCRIPT_MODULE_ID, code: '<' },
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

  return selection(parseModuleId(id)) ?? [];
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
      const unwrapped = isUnwrappedRoot(path);
      const owner = unwrapped ? stack.at(-1)?.scope : isRoot ? undefined : enclosingScope(stack, path);
      const scope: ComponentSourceScope = owner ?? {
        root: node,
        target: path.target,
        prefix: `${moduleKey}-${node.start.toString(36)}`,
        used: false,
      };

      nodes.set(node, scope);

      if ((isRoot && !unwrapped) || !owner) stack.push({ path, scope });
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
  const rootEdits = descendants.get(root) ?? [];
  const claimedBranches = new Map<string, string>();

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
      const branch = findSourceBranch(root, node, bindings);
      if (!branch) throw new Error(`vjsc: <${path.component}.${path.part}> is not contained by its component root.`);

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
          replaceWith(output) {
            const branchKey = `${branch.start}:${branch.end}`;
            const claimed = claimedBranches.get(branchKey);

            if (claimed) {
              throw new Error(
                `vjsc: <${path.component}.${path.part}> cannot preserve the same source branch as <${path.component}.${claimed}>.\n` +
                  'Reason: replacing both parts would duplicate their shared wrapper.\n' +
                  'Recommendation: place each replaced part in a separate child branch of the component root.'
              );
            }

            const enclosingEdit = rootEdits.find(
              (edit) =>
                edit.start < node.end && edit.end > node.start && (edit.start < node.start || edit.end > node.end)
            );

            if (enclosingEdit) {
              throw new Error(
                `vjsc: <${path.component}.${path.part}> cannot preserve a source branch rewritten by another component.\n` +
                  'Reason: the enclosing rewrite already owns the part source.\n' +
                  'Recommendation: move the wrapper into a separately compiled component or avoid overlapping compound rewrites.'
              );
            }

            claimedBranches.set(branchKey, path.part!);

            const branchSource = createSourceText(
              code,
              rootEdits.filter((edit) => edit.end <= node.start || edit.start >= node.end)
            );

            return createTargetReplacement(branchSource, branch.start, branch.end, node.start, node.end, output);
          },
        },
        children: group!.children,
      });
    },
  });

  return Object.fromEntries([...groups].map(([name, group]) => [name, sourcePartCollection(name, group)]));
}

function findSourceBranch(root: JSXElement, node: JSXElement, bindings: CanonicalBindings) {
  let branch = root.children.find((child) => child.start <= node.start && child.end >= node.end);

  while (branch?.type === 'JSXElement') {
    const path = canonicalPath(branch.openingElement.name, bindings);
    if (!path || !isUnwrappedRoot(path)) break;

    branch = branch.children.find((child) => child.start <= node.start && child.end >= node.end);
  }

  return branch;
}

function isUnwrappedRoot(path: CanonicalPath): boolean {
  return path.part === 'Root' && isTargetUnwrap(configuredRule(path));
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
    replaceWith(output: TargetOutput) {
      return collection.one().replaceWith(output);
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
