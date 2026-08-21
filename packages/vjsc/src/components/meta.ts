import ts from 'typescript';

import type { CompilerPlugin } from '../ts/types';

export interface ComponentMeta {
  readonly name: string;
  readonly [key: string]: unknown;
}

/** Capture compile-time component metadata and remove its export from transformed source. */
export function componentMetaPlugin(exportName = 'meta'): CompilerPlugin {
  return {
    name: 'vjsc:component-meta',
    transform(module, context) {
      const meta = readComponentMeta(module.sourceFile, exportName);
      if (!meta) return null;
      context.meta.component = meta;
      return ts.factory.updateSourceFile(
        module.sourceFile,
        module.sourceFile.statements.flatMap((statement) => removeExportedMeta(ts.factory, statement, exportName))
      );
    },
  };
}

function removeExportedMeta(
  factory: ts.NodeFactory,
  statement: ts.Statement,
  exportName: string
): readonly ts.Statement[] {
  if (!isExportedMetaStatement(statement, exportName)) return [statement];
  const declarations = statement.declarationList.declarations.filter(
    (declaration) => !ts.isIdentifier(declaration.name) || declaration.name.text !== exportName
  );
  if (declarations.length === 0) return [];
  return [
    factory.updateVariableStatement(
      statement,
      statement.modifiers,
      factory.updateVariableDeclarationList(statement.declarationList, declarations)
    ),
  ];
}

/** Read static component metadata from an already parsed source module. */
function readComponentMeta(sourceFile: ts.SourceFile, exportName = 'meta'): ComponentMeta | undefined {
  for (const statement of sourceFile.statements) {
    if (!isExportedMetaStatement(statement, exportName)) continue;
    const declaration = statement.declarationList.declarations.find(
      (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === exportName
    );
    if (!declaration?.initializer) break;
    const value = staticValue(declaration.initializer, sourceFile.fileName);
    if (!isRecord(value) || typeof value.name !== 'string' || value.name.length === 0) {
      throw new Error(
        `Component metadata \`${exportName}\` in ${sourceFile.fileName} must contain a non-empty literal \`name\`.`
      );
    }
    return value as ComponentMeta;
  }

  return undefined;
}

function isExportedMetaStatement(statement: ts.Statement, exportName: string): statement is ts.VariableStatement {
  return (
    ts.isVariableStatement(statement) &&
    statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) === true &&
    statement.declarationList.declarations.some(
      (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === exportName
    )
  );
}

function staticValue(node: ts.Expression, fileName: string): unknown {
  const expression = unwrapExpression(node);
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text;
  if (ts.isNumericLiteral(expression)) return Number(expression.text);
  if (expression.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (expression.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (expression.kind === ts.SyntaxKind.NullKeyword) return null;
  if (ts.isPrefixUnaryExpression(expression) && expression.operator === ts.SyntaxKind.MinusToken) {
    const value = staticValue(expression.operand, fileName);
    if (typeof value === 'number') return -value;
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.map((element) => staticValue(element, fileName));
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return Object.fromEntries(
      expression.properties.map((property) => {
        if (!ts.isPropertyAssignment(property)) throw nonStaticMeta(fileName);
        return [staticPropertyName(property.name, fileName), staticValue(property.initializer, fileName)];
      })
    );
  }
  throw nonStaticMeta(fileName);
}

function unwrapExpression(node: ts.Expression): ts.Expression {
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) {
    return unwrapExpression(node.expression);
  }
  return node;
}

function staticPropertyName(name: ts.PropertyName, fileName: string): string {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) return name.text;
  throw nonStaticMeta(fileName);
}

function nonStaticMeta(fileName: string): Error {
  return new Error(`Component metadata in ${fileName} must contain only static literal values.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
