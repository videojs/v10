import type { ImportDeclaration, Node, Program } from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { Plugin } from 'rolldown';

import { type ComponentTargetPluginOptions, selectComponentTargets } from './component-target';

const SCRIPT_ID = /\.[cm]?[jt]sx?(?:\?|$)/;

export function targetImportCleanupPlugin(options: ComponentTargetPluginOptions): Plugin {
  return {
    name: 'vjsc:target-import-cleanup',
    transform: {
      filter: { id: SCRIPT_ID, code: 'import' },
      handler(_code, id, transform) {
        const targets = selectComponentTargets(options.targets, id);
        if (targets.length === 0 || !transform.ast || !transform.magicString) return null;

        const sourceImports = new Set(['vjsc/components', ...targets.map((target) => target.source)]);
        const declarations = transform.ast.body.filter(
          (statement): statement is ImportDeclaration =>
            statement.type === 'ImportDeclaration' &&
            statement.specifiers.length > 0 &&
            (sourceImports.has(statement.source.value) || isTypeOnlyImport(statement))
        );
        if (declarations.length === 0) return null;

        const imported = new Set(declarations.flatMap((declaration) => declaration.specifiers.map(localName)));
        const referenced = referencedBindings(transform.ast, imported);
        let changed = false;

        for (const declaration of declarations) {
          const kept = declaration.specifiers.filter((specifier) => referenced.has(localName(specifier)));
          if (kept.length === declaration.specifiers.length) continue;

          if (kept.length === 0) {
            transform.magicString.remove(declaration.start, declaration.end);
          } else {
            transform.magicString.overwrite(declaration.start, declaration.end, renderImport(declaration, kept));
          }

          changed = true;
        }

        return changed ? { code: transform.magicString } : null;
      },
    },
  };
}

function isTypeOnlyImport(declaration: ImportDeclaration): boolean {
  return (
    declaration.importKind === 'type' ||
    declaration.specifiers.every((specifier) => specifier.type === 'ImportSpecifier' && specifier.importKind === 'type')
  );
}

function referencedBindings(ast: Program, imported: ReadonlySet<string>): ReadonlySet<string> {
  const referenced = new Set<string>();

  walk(ast, {
    enter(node, parent) {
      if (
        node.type === 'Identifier' &&
        imported.has(node.name) &&
        !isImportBinding(parent) &&
        !isPropertyName(node, parent)
      ) {
        referenced.add(node.name);
      }

      if (node.type === 'JSXIdentifier' && imported.has(node.name)) referenced.add(node.name);
    },
  });

  return referenced;
}

function isPropertyName(node: { readonly type: 'Identifier'; readonly name: string }, parent: Node | null): boolean {
  return Boolean(
    (parent?.type === 'TSQualifiedName' && parent.right === node) ||
    (parent?.type === 'MemberExpression' && !parent.computed && parent.property === node) ||
    (parent?.type === 'Property' && !parent.computed && parent.key === node && !parent.shorthand) ||
    (parent?.type === 'PropertyDefinition' && !parent.computed && parent.key === node) ||
    (parent?.type === 'MethodDefinition' && !parent.computed && parent.key === node) ||
    (parent?.type === 'AccessorProperty' && !parent.computed && parent.key === node) ||
    (parent?.type === 'TSPropertySignature' && !parent.computed && parent.key === node) ||
    (parent?.type === 'TSMethodSignature' && !parent.computed && parent.key === node)
  );
}

function isImportBinding(parent: Node | null): boolean {
  return (
    parent?.type === 'ImportSpecifier' ||
    parent?.type === 'ImportDefaultSpecifier' ||
    parent?.type === 'ImportNamespaceSpecifier'
  );
}

function renderImport(
  declaration: ImportDeclaration,
  specifiers: readonly ImportDeclaration['specifiers'][number][]
): string {
  const prefix = declaration.importKind === 'type' ? 'import type ' : 'import ';
  const defaultSpecifier = specifiers.find((specifier) => specifier.type === 'ImportDefaultSpecifier');
  const namespace = specifiers.find((specifier) => specifier.type === 'ImportNamespaceSpecifier');
  const named = specifiers.filter((specifier) => specifier.type === 'ImportSpecifier');
  const clauses: string[] = [];

  if (defaultSpecifier) clauses.push(defaultSpecifier.local.name);

  if (namespace?.type === 'ImportNamespaceSpecifier') clauses.push(`* as ${namespace.local.name}`);

  if (named.length > 0) {
    const entries = named.map((specifier) => {
      if (specifier.type !== 'ImportSpecifier') throw new Error('Expected a named import.');

      const imported =
        specifier.imported.type === 'Identifier' ? specifier.imported.name : JSON.stringify(specifier.imported.value);
      const alias = imported === specifier.local.name ? imported : `${imported} as ${specifier.local.name}`;

      return declaration.importKind !== 'type' && specifier.importKind === 'type' ? `type ${alias}` : alias;
    });

    clauses.push(`{ ${entries.join(', ')} }`);
  }

  return `${prefix}${clauses.join(', ')} from ${JSON.stringify(declaration.source.value)};`;
}

function localName(specifier: ImportDeclaration['specifiers'][number]): string {
  return specifier.local.name;
}
