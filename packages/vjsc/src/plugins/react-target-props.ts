import type { ImportDeclaration, JSXElementName, Program } from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { Plugin } from 'rolldown';

import { createTargetModuleImports } from '../target/module-imports';
import { type ComponentTargetPluginOptions, selectComponentTargets } from './component-target';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;

interface ImportBinding {
  readonly imported: string;
  readonly source: string;
}

export function reactTargetPropsPlugin(options: ComponentTargetPluginOptions): Plugin {
  return {
    name: 'vjsc:react-target-props',
    transform: {
      filter: { id: SCRIPT_ID, code: 'className' },
      handler(code, id, transform) {
        const targets = selectComponentTargets(options.targets, id);
        if (!targets.some((target) => target.jsx.attributes === 'react')) return null;

        if (!transform.ast || !transform.magicString) return null;

        const bindings = importBindings(transform.ast);
        const imports = createTargetModuleImports(transform.ast, transform.magicString);
        let changed = false;

        walk(transform.ast, {
          enter(node, parent) {
            if (
              node.type !== 'JSXAttribute' ||
              node.name.type !== 'JSXIdentifier' ||
              node.name.name !== 'className' ||
              node.value?.type !== 'JSXExpressionContainer' ||
              node.value.expression.type !== 'ArrayExpression' ||
              parent?.type !== 'JSXOpeningElement'
            ) {
              return;
            }

            const values = node.value.expression.elements.filter((value) => value !== null);
            const forwarded = values.find((value) => value.type === 'Identifier' && value.name === 'className');
            const callback = Boolean(forwarded && acceptsClassNameCallback(parent.name, bindings));
            const cn = imports.reference({ from: '@videojs/utils/style', name: 'cn' });
            const args = values
              .filter((value) => value !== forwarded)
              .map((value) => code.slice(value.start, value.end));

            if (callback) {
              const resolveClassName = imports.reference({
                from: '@videojs/utils/style',
                name: 'resolveClassName',
              });

              args.push(`${resolveClassName}(className, state)`);
            } else if (forwarded) {
              args.push('className');
            }

            const expression = `${cn}(${args.join(', ')})`;
            const replacement = callback ? `{state => ${expression}}` : `{${expression}}`;

            transform.magicString!.overwrite(node.value.start, node.value.end, replacement);
            changed = true;
          },
        });

        if (!changed) return null;

        imports.commit();
        return { code: transform.magicString };
      },
    },
  };
}

function importBindings(ast: Program): ReadonlyMap<string, ImportBinding> {
  const bindings = new Map<string, ImportBinding>();

  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type') continue;

    collectImportBindings(statement, bindings);
  }

  return bindings;
}

function collectImportBindings(declaration: ImportDeclaration, bindings: Map<string, ImportBinding>): void {
  for (const specifier of declaration.specifiers) {
    if (specifier.type !== 'ImportSpecifier' || specifier.importKind === 'type') continue;

    const imported = specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;

    bindings.set(specifier.local.name, { imported, source: declaration.source.value });
  }
}

function acceptsClassNameCallback(name: JSXElementName, bindings: ReadonlyMap<string, ImportBinding>): boolean {
  const root = jsxNameRoot(name);
  const binding = root ? bindings.get(root) : undefined;

  return binding?.source === '@videojs/react' && binding.imported !== 'Container';
}

function jsxNameRoot(name: JSXElementName): string | undefined {
  if (name.type === 'JSXIdentifier') return name.name;

  if (name.type === 'JSXNamespacedName') return undefined;

  return jsxNameRoot(name.object);
}
