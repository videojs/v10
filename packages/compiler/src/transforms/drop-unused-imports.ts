import ts from 'typescript';
import { collectReferencedIdentifiers } from '../utils/references';

/**
 * Remove import specifiers that aren't referenced anywhere else in the
 * SourceFile. Source-to-source rewrites (`replace`, `wrap`, `addProp`,
 * `transformImports`) frequently leave behind imports that the original
 * input used but the compiled artifact no longer does — `dropUnusedImports`
 * runs as a final pass to clean those up.
 *
 * Safe-by-default: module evaluation is preserved. When the last runtime
 * binding is removed, the declaration becomes a side-effect import instead
 * of disappearing. Type-only imports can be removed entirely.
 */
export function dropUnusedImports(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    return (sourceFile) => {
      const used = collectReferencedIdentifiers(sourceFile);

      const next: ts.Statement[] = [];
      for (const stmt of sourceFile.statements) {
        if (!ts.isImportDeclaration(stmt)) {
          next.push(stmt);
          continue;
        }
        next.push(...trimImport(stmt, used, context.factory));
      }
      return context.factory.updateSourceFile(sourceFile, next);
    };
  };
}

function trimImport(stmt: ts.ImportDeclaration, used: Set<string>, factory: ts.NodeFactory): ts.ImportDeclaration[] {
  const clause = stmt.importClause;
  if (!clause) return [stmt]; // side-effect import — keep as-is

  const hadRuntimeBinding = importClauseHasRuntimeBinding(clause);

  const keepDefault = clause.name && used.has(clause.name.text) ? clause.name : undefined;

  let keepNamedBindings: ts.NamedImportBindings | undefined;
  if (clause.namedBindings) {
    if (ts.isNamespaceImport(clause.namedBindings)) {
      if (used.has(clause.namedBindings.name.text)) keepNamedBindings = clause.namedBindings;
    } else {
      const keptSpecs = clause.namedBindings.elements.filter((spec) => used.has(spec.name.text));
      if (keptSpecs.length > 0) {
        keepNamedBindings = factory.createNamedImports(keptSpecs);
      }
    }
  }

  if (!keepDefault && !keepNamedBindings) {
    return hadRuntimeBinding ? [toSideEffectImport(stmt, factory)] : [];
  }

  const updated = factory.updateImportDeclaration(
    stmt,
    stmt.modifiers,
    factory.createImportClause(clause.isTypeOnly, keepDefault, keepNamedBindings),
    stmt.moduleSpecifier,
    stmt.attributes
  );
  const keepsRuntimeBinding = importClauseHasRuntimeBinding(updated.importClause!);
  return hadRuntimeBinding && !keepsRuntimeBinding ? [toSideEffectImport(stmt, factory), updated] : [updated];
}

function importClauseHasRuntimeBinding(clause: ts.ImportClause): boolean {
  if (clause.isTypeOnly) return false;
  if (clause.name) return true;
  if (!clause.namedBindings) return false;
  if (ts.isNamespaceImport(clause.namedBindings)) return true;
  return clause.namedBindings.elements.some((specifier) => !specifier.isTypeOnly);
}

function toSideEffectImport(stmt: ts.ImportDeclaration, factory: ts.NodeFactory): ts.ImportDeclaration {
  return factory.updateImportDeclaration(stmt, stmt.modifiers, undefined, stmt.moduleSpecifier, stmt.attributes);
}
