import ts from 'typescript';

/** Collect every name bound by a top-level declaration or import. */
export function collectTopLevelBindingNames(sourceFile: ts.SourceFile): Set<string> {
  const names = new Set<string>();

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      collectImportBindings(statement, names);
      continue;
    }

    if (ts.isImportEqualsDeclaration(statement)) {
      names.add(statement.name.text);
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        collectBindingName(declaration.name, names);
      }
      continue;
    }

    if (
      ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement) ||
      ts.isModuleDeclaration(statement)
    ) {
      if (statement.name && ts.isIdentifier(statement.name)) names.add(statement.name.text);
    }
  }

  return names;
}

function collectImportBindings(statement: ts.ImportDeclaration, names: Set<string>): void {
  const clause = statement.importClause;
  if (!clause) return;

  if (clause.name) names.add(clause.name.text);
  if (!clause.namedBindings) return;

  if (ts.isNamespaceImport(clause.namedBindings)) {
    names.add(clause.namedBindings.name.text);
    return;
  }

  for (const element of clause.namedBindings.elements) names.add(element.name.text);
}

function collectBindingName(binding: ts.BindingName, names: Set<string>): void {
  if (ts.isIdentifier(binding)) {
    names.add(binding.text);
    return;
  }

  for (const element of binding.elements) {
    if (!ts.isOmittedExpression(element)) collectBindingName(element.name, names);
  }
}
