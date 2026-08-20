import ts from 'typescript';
import { collectTopLevelBindingNames } from '../utils/bindings';
import { isImportDeclarationFrom } from '../utils/import-declaration';
import { insertStatementsAfterImports } from '../utils/source-file';
import { rebaseImportSpecifier } from './imports';

export interface AddImportRef {
  source: string;
  name: string;
  default?: boolean | undefined;
  type?: boolean | undefined;
}

export interface AddImportContext {
  configDir?: string | undefined;
  outputFile?: string | undefined;
}

/** Add a bare side-effect import unless the source is already imported. */
export function addSideEffectImport(sourceFile: ts.SourceFile, source: string, factory: ts.NodeFactory): ts.SourceFile {
  if (sourceFile.statements.some((statement) => isImportDeclarationFrom(statement, source))) return sourceFile;

  return insertStatementsAfterImports(
    sourceFile,
    [factory.createImportDeclaration(undefined, undefined, factory.createStringLiteral(source))],
    factory
  );
}

/**
 * Add a named import (`import { name } from "source"`) to a SourceFile if not
 * already present. Existing imports from the same source are extended in
 * place; otherwise a new import is appended after the last import statement.
 *
 * Relative `source` values are resolved against `configDir` and re-projected
 * relative to `outputFile` (same rule as `transformImports`).
 */
export function addNamedImport(
  sourceFile: ts.SourceFile,
  ref: AddImportRef,
  factory: ts.NodeFactory,
  context: AddImportContext = {}
): ts.SourceFile {
  const target = ref.source.startsWith('.')
    ? rebaseImportSpecifier(ref.source, { rules: {}, configDir: context.configDir, outputFile: context.outputFile })
    : ref.source;

  const existing = findImportBinding(sourceFile, target, ref);
  if (existing) {
    if (ref.type || !existing.typeOnly) return sourceFile;

    // A runtime reference cannot reuse a type-only binding. Remove the
    // type-only form first, then materialize a value import without leaving a
    // duplicate local declaration behind.
    return addNamedImport(removeImportBinding(sourceFile, existing, factory), ref, factory, context);
  }

  if (collectTopLevelBindingNames(sourceFile).has(ref.name)) {
    throw new Error(
      `Cannot import ${JSON.stringify(ref.name)} from ${JSON.stringify(target)}: ` +
        `the local binding ${JSON.stringify(ref.name)} is already declared.`
    );
  }

  const updated = addToExistingImport(sourceFile, target, ref, factory);
  if (updated) return updated;

  const newImport = factory.createImportDeclaration(
    undefined,
    factory.createImportClause(
      Boolean(ref.type),
      ref.default ? factory.createIdentifier(ref.name) : undefined,
      ref.default
        ? undefined
        : factory.createNamedImports([
            factory.createImportSpecifier(false, undefined, factory.createIdentifier(ref.name)),
          ])
    ),
    factory.createStringLiteral(target)
  );
  return insertStatementsAfterImports(sourceFile, [newImport], factory);
}

interface ImportBinding {
  declaration: ts.ImportDeclaration;
  specifier?: ts.ImportSpecifier | undefined;
  typeOnly: boolean;
  kind: 'default' | 'named';
}

function findImportBinding(sourceFile: ts.SourceFile, target: string, ref: AddImportRef): ImportBinding | undefined {
  for (const stmt of sourceFile.statements) {
    if (!isImportDeclarationFrom(stmt, target)) continue;
    const clause = stmt.importClause;
    if (!clause) continue;

    if (ref.default) {
      if (clause.name?.text === ref.name) {
        return { declaration: stmt, typeOnly: clause.isTypeOnly, kind: 'default' };
      }
      continue;
    }

    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    const specifier = clause.namedBindings.elements.find(
      (element) => element.name.text === ref.name && (element.propertyName?.text ?? element.name.text) === ref.name
    );
    if (specifier) {
      return {
        declaration: stmt,
        specifier,
        typeOnly: clause.isTypeOnly || specifier.isTypeOnly,
        kind: 'named',
      };
    }
  }
  return undefined;
}

function removeImportBinding(
  sourceFile: ts.SourceFile,
  binding: ImportBinding,
  factory: ts.NodeFactory
): ts.SourceFile {
  const declaration = binding.declaration;
  const clause = declaration.importClause!;
  const name = binding.kind === 'default' ? undefined : clause.name;
  let namedBindings = clause.namedBindings;

  if (binding.kind === 'named' && namedBindings && ts.isNamedImports(namedBindings)) {
    const elements = namedBindings.elements.filter((element) => element !== binding.specifier);
    namedBindings = elements.length > 0 ? factory.updateNamedImports(namedBindings, elements) : undefined;
  }

  const replacement =
    name || namedBindings
      ? factory.updateImportDeclaration(
          declaration,
          declaration.modifiers,
          factory.updateImportClause(clause, clause.isTypeOnly, name, namedBindings),
          declaration.moduleSpecifier,
          declaration.attributes
        )
      : undefined;

  return factory.updateSourceFile(
    sourceFile,
    sourceFile.statements.flatMap((statement) =>
      statement === declaration ? (replacement ? [replacement] : []) : [statement]
    )
  );
}

function addToExistingImport(
  sourceFile: ts.SourceFile,
  target: string,
  ref: AddImportRef,
  factory: ts.NodeFactory
): ts.SourceFile | undefined {
  for (const stmt of sourceFile.statements) {
    if (!isImportDeclarationFrom(stmt, target)) continue;
    const clause = stmt.importClause;
    if (!clause) continue;

    if (ref.default) {
      if (clause.name || clause.isTypeOnly !== Boolean(ref.type)) continue;
      if (ref.type && clause.namedBindings) continue;
      const updated = factory.updateImportDeclaration(
        stmt,
        stmt.modifiers,
        factory.updateImportClause(clause, clause.isTypeOnly, factory.createIdentifier(ref.name), clause.namedBindings),
        stmt.moduleSpecifier,
        stmt.attributes
      );
      return replaceStatement(sourceFile, stmt, updated, factory);
    }

    if (!ref.type && clause.isTypeOnly) continue;
    if (!clause.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;

    const updated = factory.updateImportDeclaration(
      stmt,
      stmt.modifiers,
      factory.updateImportClause(
        clause,
        clause.isTypeOnly,
        clause.name,
        factory.createNamedImports([
          ...clause.namedBindings.elements,
          factory.createImportSpecifier(
            Boolean(ref.type) && !clause.isTypeOnly,
            undefined,
            factory.createIdentifier(ref.name)
          ),
        ])
      ),
      stmt.moduleSpecifier,
      stmt.attributes
    );
    return replaceStatement(sourceFile, stmt, updated, factory);
  }
  return undefined;
}

function replaceStatement(
  sourceFile: ts.SourceFile,
  current: ts.Statement,
  replacement: ts.Statement,
  factory: ts.NodeFactory
): ts.SourceFile {
  return factory.updateSourceFile(
    sourceFile,
    sourceFile.statements.map((statement) => (statement === current ? replacement : statement))
  );
}
