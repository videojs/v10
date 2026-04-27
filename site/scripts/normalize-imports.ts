import ts from 'typescript';

function createSourceFile(filePath: string, source: string): ts.SourceFile {
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function isDirectivePrologueStatement(statement: ts.Statement): boolean {
  return ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression);
}

function getImportStatementText(source: string, node: ts.ImportDeclaration): string {
  return source.slice(node.getFullStart(), node.getEnd()).trim();
}

export function normalizeImports(source: string): string {
  const sourceFile = createSourceFile('imports.tsx', source);
  const sideEffectImports = new Set<string>();
  // Map<module, Map<identifierName, { isType, alias? }>>
  const namedImports = new Map<string, Map<string, { isType: boolean; alias: string | undefined }>>();
  const rawImports: string[] = [];
  let bodyStart = 0;

  for (const statement of sourceFile.statements) {
    if (isDirectivePrologueStatement(statement)) {
      bodyStart = statement.getEnd();
      continue;
    }

    if (!ts.isImportDeclaration(statement)) {
      break;
    }

    bodyStart = statement.getEnd();
    const specifier = statement.moduleSpecifier.getText(sourceFile).slice(1, -1);
    const importClause = statement.importClause;

    if (!importClause) {
      sideEffectImports.add(specifier);
      continue;
    }

    const namedBindings = importClause.namedBindings;
    if (importClause.name || (namedBindings && !ts.isNamedImports(namedBindings))) {
      rawImports.push(getImportStatementText(source, statement));
      continue;
    }

    if (!namedBindings || !ts.isNamedImports(namedBindings)) continue;

    const names = namedImports.get(specifier) ?? new Map<string, { isType: boolean; alias: string | undefined }>();
    const isStatementTypeOnly = Boolean(importClause.isTypeOnly);

    for (const element of namedBindings.elements) {
      const isType = element.isTypeOnly || isStatementTypeOnly;
      const name = (element.propertyName ?? element.name).text;
      const alias = element.propertyName ? element.name.text : undefined;
      const existing = names.get(name);

      // Value import subsumes type — if already seen as value, keep it
      if (!existing || (!isType && existing.isType)) {
        names.set(name, { isType, alias });
      }
    }

    namedImports.set(specifier, names);
  }

  const importLines = [
    ...[...sideEffectImports].map((specifier) => `import '${specifier}';`),
    ...rawImports,
    ...[...namedImports.entries()].map(([specifier, names]) => {
      const specifiers = [...names.entries()].map(([name, { isType, alias }]) => {
        const prefix = isType ? 'type ' : '';
        return alias ? `${prefix}${name} as ${alias}` : `${prefix}${name}`;
      });
      return `import { ${specifiers.join(', ')} } from '${specifier}';`;
    }),
  ];
  const body = source.slice(bodyStart).replace(/^\s+/, '');

  if (importLines.length === 0) {
    return body;
  }

  return `${importLines.join('\n')}\n\n${body}`;
}
