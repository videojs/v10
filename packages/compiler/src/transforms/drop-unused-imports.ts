import ts from 'typescript';

/**
 * Remove import specifiers that aren't referenced anywhere else in the
 * SourceFile. Source-to-source rewrites (`replace`, `wrap`, `addProp`,
 * `transformImports`) frequently leave behind imports that the original
 * skin used but the compiled artifact no longer does — `dropUnusedImports`
 * runs as a final pass to clean those up.
 *
 * Safe-by-default: side-effect imports (`import 'x'`) are preserved. Default
 * imports and namespace imports are preserved unless their local name is
 * never referenced in any non-import position.
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
        const trimmed = trimImport(stmt, used, context.factory);
        if (trimmed) next.push(trimmed);
      }
      return context.factory.updateSourceFile(sourceFile, next);
    };
  };
}

function collectReferencedIdentifiers(sourceFile: ts.SourceFile): Set<string> {
  const used = new Set<string>();

  const visit = (node: ts.Node, inImport: boolean): void => {
    if (ts.isImportDeclaration(node)) {
      // Skip the import declaration entirely — its identifiers are declarations,
      // not references. (Module specifier is a string literal, no identifiers.)
      return;
    }
    if (ts.isIdentifier(node) && !inImport) {
      used.add(node.text);
    }
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxClosingElement(node)) {
      collectFromTagName(node.tagName, used);
    }
    ts.forEachChild(node, (c) => visit(c, inImport));
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

function trimImport(
  stmt: ts.ImportDeclaration,
  used: Set<string>,
  factory: ts.NodeFactory
): ts.ImportDeclaration | null {
  const clause = stmt.importClause;
  if (!clause) return stmt; // side-effect import — keep as-is

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

  if (!keepDefault && !keepNamedBindings) return null;

  return factory.updateImportDeclaration(
    stmt,
    stmt.modifiers,
    factory.createImportClause(clause.isTypeOnly, keepDefault, keepNamedBindings),
    stmt.moduleSpecifier,
    stmt.attributes
  );
}
