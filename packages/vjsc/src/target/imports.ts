import type { ImportDeclaration, Program } from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { RolldownMagicString } from 'rolldown';

import type { TargetImport } from './definition';

export class TargetImports {
  readonly #ast: Program;
  readonly #magicString: RolldownMagicString;
  readonly #usedNames: Set<string>;
  readonly #existing = new Map<string, string>();
  readonly #requested = new Map<string, Map<string, string>>();
  readonly #sideEffects = new Set<string>();

  constructor(ast: Program, magicString: RolldownMagicString) {
    this.#ast = ast;
    this.#magicString = magicString;
    this.#usedNames = collectIdentifierNames(ast);

    for (const statement of ast.body) {
      if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type') continue;
      this.#collectExisting(statement);
    }
  }

  reference(target: TargetImport): string {
    const key = importKey(target.from, target.name);
    let local = this.#existing.get(key);

    if (!local) {
      let imports = this.#requested.get(target.from);
      if (!imports) {
        imports = new Map();
        this.#requested.set(target.from, imports);
      }

      local = imports.get(target.name);
      if (!local) {
        local = this.#allocateName(target.name);
        imports.set(target.name, local);
      }
    }

    return target.path?.length ? `${local}.${target.path.join('.')}` : local;
  }

  sideEffect(source: string): void {
    if (!this.#hasRuntimeImportFrom(source)) this.#sideEffects.add(source);
  }

  commit(): void {
    const statements = [
      ...[...this.#sideEffects].map((source) => `import ${JSON.stringify(source)};`),
      ...[...this.#requested].map(([source, imports]) => {
        const specifiers = [...imports].map(([imported, local]) =>
          imported === local ? imported : `${imported} as ${local}`
        );

        return `import { ${specifiers.join(', ')} } from ${JSON.stringify(source)};`;
      }),
    ];

    insertModuleImports(this.#ast, this.#magicString, statements);
  }

  #collectExisting(declaration: ImportDeclaration): void {
    const source = declaration.source.value;

    for (const specifier of declaration.specifiers) {
      if (specifier.type !== 'ImportSpecifier' || specifier.importKind === 'type') continue;
      const imported = specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;

      this.#existing.set(importKey(source, imported), specifier.local.name);
    }
  }

  #allocateName(imported: string): string {
    const base = imported === 'default' ? 'Target' : imported;
    if (!this.#usedNames.has(base)) {
      this.#usedNames.add(base);
      return base;
    }

    const primitive = `${base}Primitive`;
    let candidate = primitive;
    let suffix = 2;

    while (this.#usedNames.has(candidate)) candidate = `${primitive}${suffix++}`;

    this.#usedNames.add(candidate);
    return candidate;
  }

  #hasRuntimeImportFrom(source: string): boolean {
    return this.#ast.body.some(
      (statement) =>
        statement.type === 'ImportDeclaration' &&
        statement.source.value === source &&
        statement.importKind !== 'type' &&
        (statement.specifiers.length === 0 ||
          statement.specifiers.some(
            (specifier) => specifier.type !== 'ImportSpecifier' || specifier.importKind !== 'type'
          ))
    );
  }
}

function importKey(source: string, name: string): string {
  return `${source}\0${name}`;
}

export function collectIdentifierNames(ast: Program): Set<string> {
  const names = new Set<string>();

  walk(ast, {
    enter(node) {
      if (node.type === 'Identifier') names.add(node.name);
    },
  });

  return names;
}

export function insertModuleImports(
  ast: Program,
  magicString: RolldownMagicString,
  statements: readonly string[]
): void {
  if (statements.length === 0) return;

  let leadingEnd: number | undefined;
  for (const statement of ast.body) {
    if (statement.type !== 'ImportDeclaration' && !('directive' in statement && statement.directive)) break;
    leadingEnd = statement.end;
  }

  if (leadingEnd !== undefined) {
    magicString.appendLeft(leadingEnd, `\n${statements.join('\n')}\n`);
    return;
  }

  const insertion = ast.body[0]?.start ?? ast.hashbang?.end ?? 0;
  const prefix = ast.body.length === 0 && ast.hashbang ? '\n' : '';
  magicString.appendLeft(insertion, `${prefix}${statements.join('\n')}\n`);
}
