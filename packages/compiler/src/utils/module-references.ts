import ts from 'typescript';
import { collectReferencedIdentifiers } from './references';

export interface ModuleReference {
  source: string;
  node: ts.StringLiteralLike;
  names: readonly string[];
  ambiguous: boolean;
}

/** Collect runtime module references and the named imports used by the source file. */
export function collectModuleReferences(sourceFile: ts.SourceFile): ModuleReference[] {
  const references: ModuleReference[] = [];
  const usedNames = collectReferencedIdentifiers(sourceFile);

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteralLike(statement.moduleSpecifier)) {
      const names: string[] = [];
      let ambiguous = false;
      const clause = statement.importClause;
      if (clause && !clause.isTypeOnly) {
        if (clause.name && usedNames.has(clause.name.text)) ambiguous = true;
        if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings)) {
          if (usedNames.has(clause.namedBindings.name.text)) ambiguous = true;
        } else if (clause.namedBindings) {
          for (const element of clause.namedBindings.elements) {
            if (!element.isTypeOnly && usedNames.has(element.name.text)) {
              names.push(element.propertyName?.text ?? element.name.text);
            }
          }
        }
      }
      references.push({ source: statement.moduleSpecifier.text, node: statement.moduleSpecifier, names, ambiguous });
      continue;
    }

    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteralLike(statement.moduleSpecifier)
    ) {
      const names =
        !statement.isTypeOnly && statement.exportClause && ts.isNamedExports(statement.exportClause)
          ? statement.exportClause.elements
              .filter((element) => !element.isTypeOnly)
              .map((element) => element.propertyName?.text ?? element.name.text)
          : [];
      references.push({
        source: statement.moduleSpecifier.text,
        node: statement.moduleSpecifier,
        names,
        ambiguous: !statement.isTypeOnly && (!statement.exportClause || ts.isNamespaceExport(statement.exportClause)),
      });
    }
  }

  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0]!)
    ) {
      references.push({ source: node.arguments[0]!.text, node: node.arguments[0]!, names: [], ambiguous: true });
    } else if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      references.push({ source: node.argument.literal.text, node: node.argument.literal, names: [], ambiguous: false });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);

  return references;
}
