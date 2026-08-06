import ts from 'typescript';
import { collectReferencedIdentifiers } from '../utils/references';

/**
 * Remove top-level `const x = <expr>;` declarations whose name isn't
 * referenced anywhere else in the SourceFile, when `<expr>` is provably
 * side-effect-free (a className array of literals/token refs).
 *
 * Source-to-source rewrites that resolve local className arrays or replace JSX
 * frequently leave locals stranded. This pass cleans them up so the generated
 * artifact doesn't trip TypeScript's `noUnusedLocals` warning.
 */
export function dropUnusedLocals(): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    return (sourceFile) => {
      const used = collectReferencedIdentifiers(sourceFile);
      const next: ts.Statement[] = [];

      for (const stmt of sourceFile.statements) {
        if (!ts.isVariableStatement(stmt)) {
          next.push(stmt);
          continue;
        }
        // Preserve exported declarations untouched — they're API surface.
        const isExport = (stmt.modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
        if (isExport) {
          next.push(stmt);
          continue;
        }

        const keptDecls = stmt.declarationList.declarations.filter((decl) => {
          if (!ts.isIdentifier(decl.name)) return true;
          if (used.has(decl.name.text)) return true;
          if (!decl.initializer) return true;
          return !isPureExpression(decl.initializer);
        });

        if (keptDecls.length === 0) continue;
        if (keptDecls.length === stmt.declarationList.declarations.length) {
          next.push(stmt);
          continue;
        }
        next.push(
          context.factory.updateVariableStatement(
            stmt,
            stmt.modifiers,
            context.factory.updateVariableDeclarationList(stmt.declarationList, keptDecls)
          )
        );
      }

      return context.factory.updateSourceFile(sourceFile, next);
    };
  };
}

/**
 * Conservative pattern check: drop only class-list-shaped `const X = [<parts>]`
 * where every item is a string literal, identifier, or nested array of the
 * same, and at least one item is a string literal. Property access is not
 * considered pure because evaluating it can invoke a getter.
 */
function isPureExpression(node: ts.Expression): boolean {
  return ts.isArrayLiteralExpression(node) && node.elements.every(isPureArrayItem) && hasClassLikeItem(node);
}

function isPureArrayItem(node: ts.Expression): boolean {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return true;
  if (ts.isIdentifier(node)) return true;
  if (ts.isParenthesizedExpression(node)) return isPureArrayItem(node.expression);
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) return isPureArrayItem(node.expression);
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.every((e) => !ts.isSpreadElement(e) && isPureArrayItem(e as ts.Expression));
  }
  return false;
}

function hasClassLikeItem(node: ts.ArrayLiteralExpression): boolean {
  return node.elements.some((item) => {
    if (ts.isSpreadElement(item)) return false;
    if (ts.isStringLiteral(item) || ts.isNoSubstitutionTemplateLiteral(item)) return true;
    if (ts.isParenthesizedExpression(item)) return hasClassLikeExpression(item.expression);
    if (ts.isAsExpression(item) || ts.isTypeAssertionExpression(item)) return hasClassLikeExpression(item.expression);
    if (ts.isArrayLiteralExpression(item)) return hasClassLikeItem(item);
    return false;
  });
}

function hasClassLikeExpression(node: ts.Expression): boolean {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return true;
  if (ts.isParenthesizedExpression(node)) return hasClassLikeExpression(node.expression);
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) return hasClassLikeExpression(node.expression);
  return ts.isArrayLiteralExpression(node) && hasClassLikeItem(node);
}
