import type { ImportDeclaration, Program } from '@oxc-project/types';
import { walk } from 'oxc-walker';
import type { RolldownMagicString } from 'rolldown';

export interface ModuleImport {
  readonly from: string;
  readonly name: string;
  readonly path?: readonly string[] | undefined;
}

export interface ModuleImportsOptions {
  readonly collisionSuffix?: string | undefined;
  readonly defaultImportName?: string | undefined;
}

/** Collect collision-safe runtime imports and insert them together. */
export class ModuleImports {
  readonly #ast: Program;
  readonly #magicString: RolldownMagicString;
  readonly #usedNames: Set<string>;
  readonly #existing = new Map<string, string>();
  readonly #requested = new Map<string, Map<string, string>>();
  readonly #sideEffects = new Set<string>();
  readonly #options: ModuleImportsOptions;

  constructor(ast: Program, magicString: RolldownMagicString, options: ModuleImportsOptions = {}) {
    this.#ast = ast;
    this.#magicString = magicString;
    this.#options = options;
    this.#usedNames = collectIdentifierNames(ast);

    for (const statement of ast.body) {
      if (statement.type !== 'ImportDeclaration' || statement.importKind === 'type') continue;

      this.#collectExisting(statement);
    }
  }

  reference(moduleImport: ModuleImport): string {
    const key = importKey(moduleImport.from, moduleImport.name);
    let local = this.#existing.get(key);

    if (!local) {
      let imports = this.#requested.get(moduleImport.from);

      if (!imports) {
        imports = new Map();
        this.#requested.set(moduleImport.from, imports);
      }

      local = imports.get(moduleImport.name);

      if (!local) {
        local = this.#allocateName(moduleImport.name);
        imports.set(moduleImport.name, local);
      }
    }

    return moduleImport.path?.length ? `${local}.${moduleImport.path.join('.')}` : local;
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
    const base = imported === 'default' ? (this.#options.defaultImportName ?? 'Imported') : imported;

    if (!this.#usedNames.has(base)) {
      this.#usedNames.add(base);
      return base;
    }

    const importedName = `${base}${this.#options.collisionSuffix ?? 'Import'}`;
    let candidate = importedName;
    let suffix = 2;

    while (this.#usedNames.has(candidate)) candidate = `${importedName}${suffix++}`;

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
