import ts from 'typescript';

export interface RewriteModuleSpecifiersOptions {
  filename: string;
  resolve(specifier: string): string | null | undefined;
}

export function rewriteModuleSpecifiers(source: string, options: RewriteModuleSpecifiersOptions): string {
  const sourceFile = ts.createSourceFile(
    options.filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(options.filename)
  );
  const result = ts.transform(sourceFile, [moduleSpecifierTransform(options.resolve)]);
  try {
    return ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(result.transformed[0]!);
  } finally {
    result.dispose();
  }
}

export function collectModuleSpecifiers(source: string, filename: string): string[] {
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, scriptKind(filename));
  const specifiers: string[] = [];
  const visit = (node: ts.Node): void => {
    const specifier = moduleSpecifier(node);
    if (specifier) specifiers.push(specifier.text);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

function moduleSpecifierTransform(
  resolve: RewriteModuleSpecifiersOptions['resolve']
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const visit = (node: ts.Node): ts.VisitResult<ts.Node> => {
      const specifier = moduleSpecifier(node);
      if (specifier) {
        const replacement = resolve(specifier.text);
        if (replacement && replacement !== specifier.text) {
          const literal = context.factory.createStringLiteral(replacement);
          if (ts.isImportDeclaration(node)) {
            return context.factory.updateImportDeclaration(
              node,
              node.modifiers,
              node.importClause,
              literal,
              node.attributes
            );
          }
          if (ts.isExportDeclaration(node)) {
            return context.factory.updateExportDeclaration(
              node,
              node.modifiers,
              node.isTypeOnly,
              node.exportClause,
              literal,
              node.attributes
            );
          }
          if (ts.isCallExpression(node)) {
            return context.factory.updateCallExpression(node, node.expression, node.typeArguments, [literal]);
          }
        }
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (sourceFile) => ts.visitEachChild(sourceFile, visit, context);
  };
}

function moduleSpecifier(node: ts.Node): ts.StringLiteralLike | undefined {
  if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
    return node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier) ? node.moduleSpecifier : undefined;
  }
  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1 &&
    ts.isStringLiteralLike(node.arguments[0]!)
  ) {
    return node.arguments[0];
  }
  return undefined;
}

function scriptKind(filename: string): ts.ScriptKind {
  if (filename.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (filename.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (filename.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}
