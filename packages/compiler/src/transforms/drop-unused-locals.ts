import ts from 'typescript';

/**
 * Remove top-level `const x = <expr>;` declarations whose name isn't
 * referenced anywhere else in the SourceFile, when `<expr>` is provably
 * side-effect-free (a `cn(...)` call, a string literal, or a property access).
 *
 * Source-to-source rewrites (`tailwindPlugin` resolving local cn() consts
 * into class strings, `replace`/`childAsProp` replacing JSX) frequently leave
 * locals stranded. This pass cleans them up so the generated artifact doesn't
 * trip TypeScript's `noUnusedLocals` warning.
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

/** Walk every non-declaration position in the source, collecting referenced identifier names. */
function collectReferencedIdentifiers(sourceFile: ts.SourceFile): Set<string> {
  const used = new Set<string>();

  const visit = (node: ts.Node, declaring: boolean): void => {
    if (ts.isImportDeclaration(node)) return;

    // Variable declarators: their name is a declaration, but the initializer
    // is a normal expression that may reference *other* identifiers.
    if (ts.isVariableDeclaration(node)) {
      if (node.initializer) visit(node.initializer, false);
      return;
    }

    if (ts.isIdentifier(node) && !declaring) {
      used.add(node.text);
    }

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxClosingElement(node)) {
      collectFromTagName(node.tagName, used);
    }

    ts.forEachChild(node, (c) => visit(c, declaring));
  };

  ts.forEachChild(sourceFile, (c) => visit(c, false));
  return used;
}

function collectFromTagName(name: ts.JsxTagNameExpression, into: Set<string>): void {
  if (ts.isIdentifier(name)) {
    into.add(name.text);
    return;
  }
  if (ts.isPropertyAccessExpression(name)) {
    collectFromTagName(name.expression as ts.JsxTagNameExpression, into);
  }
}

/**
 * Conservative pattern check: drop only `const X = cn(<args>)` where every
 * argument is a string literal, identifier, dotted access, array literal of
 * the same, or a nested `cn(...)` call. Skipping other shapes (bare
 * identifier RHS, property access, etc.) keeps the pass narrow — the caller
 * presumably had a reason to materialize the binding.
 */
function isPureExpression(node: ts.Expression): boolean {
  if (!ts.isCallExpression(node)) return false;
  if (!ts.isIdentifier(node.expression) || node.expression.text !== 'cn') return false;
  return node.arguments.every(isPureCnArgument);
}

function isPureCnArgument(node: ts.Expression): boolean {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return true;
  if (ts.isIdentifier(node)) return true;
  if (ts.isPropertyAccessExpression(node)) return isPureCnArgument(node.expression);
  if (ts.isParenthesizedExpression(node)) return isPureCnArgument(node.expression);
  if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) return isPureCnArgument(node.expression);
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.every((e) => !ts.isSpreadElement(e) && isPureCnArgument(e as ts.Expression));
  }
  if (ts.isCallExpression(node)) {
    return isPureExpression(node);
  }
  return false;
}
