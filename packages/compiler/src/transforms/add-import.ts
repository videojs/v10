import ts from 'typescript';
import { resolveRelative } from './imports';

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
    ? resolveRelative(ref.source, { rules: {}, configDir: context.configDir, outputFile: context.outputFile })
    : ref.source;

  // Already imported?
  for (const stmt of sourceFile.statements) {
    if (!ts.isImportDeclaration(stmt)) continue;
    if (!ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    if (stmt.moduleSpecifier.text !== target) continue;
    const clause = stmt.importClause;
    if (ref.default) {
      if (!clause) continue;
      if (clause.isTypeOnly !== Boolean(ref.type)) continue;
      if (clause.name?.text === ref.name) return sourceFile;
      if (clause.name) continue;

      const updated = factory.updateImportDeclaration(
        stmt,
        stmt.modifiers,
        factory.createImportClause(clause.isTypeOnly, factory.createIdentifier(ref.name), clause.namedBindings),
        stmt.moduleSpecifier,
        stmt.attributes
      );
      return factory.updateSourceFile(
        sourceFile,
        sourceFile.statements.map((s) => (s === stmt ? updated : s))
      );
    }

    if (!clause?.namedBindings || !ts.isNamedImports(clause.namedBindings)) continue;
    if (clause.isTypeOnly && !ref.type) continue;
    if (clause.namedBindings.elements.some((e) => e.name.text === ref.name)) {
      return sourceFile;
    }
    const updated = factory.updateImportDeclaration(
      stmt,
      stmt.modifiers,
      factory.createImportClause(
        false,
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
    return factory.updateSourceFile(
      sourceFile,
      sourceFile.statements.map((s) => (s === stmt ? updated : s))
    );
  }

  // Append new import after the last import statement.
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
  let lastImportIdx = -1;
  for (let i = 0; i < sourceFile.statements.length; i++) {
    if (ts.isImportDeclaration(sourceFile.statements[i]!)) lastImportIdx = i;
  }
  const next = [...sourceFile.statements];
  next.splice(lastImportIdx + 1, 0, newImport);
  return factory.updateSourceFile(sourceFile, next);
}
