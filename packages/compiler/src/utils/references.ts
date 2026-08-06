import ts from 'typescript';

/**
 * Collect identifier names used in expression and type positions.
 *
 * This is intentionally syntactic: cleanup transforms use it to make
 * conservative keep/drop decisions without constructing a type checker.
 */
export function collectReferencedIdentifiers(sourceFile: ts.SourceFile): Set<string> {
  const referenced = new Set<string>();

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) return;
    if (ts.isImportEqualsDeclaration(node)) return;

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      collectJsxTagRoot(node.tagName, referenced);
      ts.forEachChild(node.attributes, visit);
      return;
    }
    if (ts.isJsxClosingElement(node)) {
      collectJsxTagRoot(node.tagName, referenced);
      return;
    }
    if (ts.isJsxAttribute(node)) {
      if (node.initializer) visit(node.initializer);
      return;
    }
    if (ts.isPropertyAccessExpression(node)) {
      visit(node.expression);
      return;
    }
    if (ts.isQualifiedName(node)) {
      visit(node.left);
      return;
    }
    if (ts.isBindingElement(node)) {
      if (node.initializer) visit(node.initializer);
      return;
    }
    if (ts.isVariableDeclaration(node)) {
      if (node.type) visit(node.type);
      if (node.initializer) visit(node.initializer);
      return;
    }
    if (ts.isPropertyAssignment(node)) {
      if (ts.isComputedPropertyName(node.name)) visit(node.name.expression);
      visit(node.initializer);
      return;
    }
    if (isNamedDeclaration(node)) {
      const { name } = node;
      ts.forEachChild(node, (child) => {
        if (child !== name) visit(child);
        else if (name && ts.isComputedPropertyName(name)) visit(name.expression);
      });
      return;
    }
    if (ts.isIdentifier(node)) referenced.add(node.text);

    ts.forEachChild(node, visit);
  };

  ts.forEachChild(sourceFile, visit);
  return referenced;
}

function isNamedDeclaration(node: ts.Node): node is ts.NamedDeclaration {
  return (
    ts.isParameter(node) ||
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isClassDeclaration(node) ||
    ts.isClassExpression(node) ||
    ts.isInterfaceDeclaration(node) ||
    ts.isTypeAliasDeclaration(node) ||
    ts.isEnumDeclaration(node) ||
    ts.isEnumMember(node) ||
    ts.isModuleDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isMethodSignature(node) ||
    ts.isPropertyDeclaration(node) ||
    ts.isPropertySignature(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isTypeParameterDeclaration(node)
  );
}

function collectJsxTagRoot(name: ts.JsxTagNameExpression, referenced: Set<string>, isMemberExpression = false): void {
  if (ts.isIdentifier(name)) {
    if (isMemberExpression || isComponentIdentifier(name.text)) referenced.add(name.text);
    return;
  }
  if (ts.isPropertyAccessExpression(name)) {
    collectJsxTagRoot(name.expression as ts.JsxTagNameExpression, referenced, true);
  }
}

function isComponentIdentifier(name: string): boolean {
  return /^[A-Z]/.test(name);
}
