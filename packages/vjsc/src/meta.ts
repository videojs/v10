import { globSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

import ts from 'typescript';

import type { CompilerPlugin } from './config';
import { toPosixPath } from './utils/path';
import { sourceScriptKind } from './utils/source-module';

export interface VjscModuleMeta {
  readonly name: string;
  readonly [key: string]: unknown;
}

export interface DiscoverVjscModulesOptions {
  readonly rootDir: string;
  readonly include: string | readonly string[];
  readonly exclude?: string | readonly string[] | undefined;
  readonly exportName?: string | undefined;
}

/** Discover self-describing VJSC modules without evaluating their source. */
export function discoverVjscModules<Item extends VjscModuleMeta = VjscModuleMeta>(
  options: DiscoverVjscModulesOptions
): readonly (Item & { readonly source: string })[] {
  const rootDir = resolve(options.rootDir);
  const patterns = typeof options.include === 'string' ? [options.include] : options.include;
  const exportName = options.exportName ?? 'meta';
  const sourceFiles = [
    ...new Set(
      patterns.flatMap((pattern) =>
        globSync(pattern, { cwd: rootDir, ...(options.exclude ? { exclude: options.exclude } : {}) }).map((path) =>
          isAbsolute(path) ? path : resolve(rootDir, path)
        )
      )
    ),
  ].sort();

  const items = sourceFiles.flatMap((fileName) => {
    const meta = findVjscModuleMeta(readFileSync(fileName, 'utf8'), fileName, exportName) as Item | undefined;
    if (!meta) return [];
    if ('source' in meta) throw new Error(`VJSC module metadata in ${fileName} must not declare \`source\`.`);
    const path = toPosixPath(relative(rootDir, fileName));
    return [{ ...meta, source: `./${path}` }];
  });
  const names = new Set<string>();

  for (const item of items) {
    if (names.has(item.name)) throw new Error(`VJSC module \`${item.name}\` is declared more than once.`);
    names.add(item.name);
  }

  return items.sort((left, right) => left.name.localeCompare(right.name));
}

/** Remove compile-time metadata from transformed VJSC modules. */
export function moduleMetaPlugin(exportName = 'meta'): CompilerPlugin {
  return {
    name: 'vjsc:module-meta',
    enforce: 'pre',
    setup() {
      return {
        transform: (context) => (sourceFile) =>
          context.factory.updateSourceFile(
            sourceFile,
            sourceFile.statements.filter((statement) => !isExportedMetaStatement(statement, exportName))
          ),
      };
    },
  };
}

export function extractVjscModuleMeta(source: string, fileName: string, exportName = 'meta'): VjscModuleMeta {
  const meta = findVjscModuleMeta(source, fileName, exportName);
  if (meta) return meta;
  throw new Error(`VJSC source ${fileName} must export a static \`${exportName}\` object.`);
}

function findVjscModuleMeta(source: string, fileName: string, exportName: string): VjscModuleMeta | undefined {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, sourceScriptKind(fileName));

  for (const statement of sourceFile.statements) {
    if (!isExportedMetaStatement(statement, exportName)) continue;
    const declaration = statement.declarationList.declarations.find(
      (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === exportName
    );
    if (!declaration?.initializer) break;
    const value = staticValue(declaration.initializer, fileName);
    if (!isRecord(value) || typeof value.name !== 'string' || value.name.length === 0) {
      throw new Error(`VJSC metadata \`${exportName}\` in ${fileName} must contain a non-empty literal \`name\`.`);
    }
    return value as VjscModuleMeta;
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
  return new Error(`VJSC metadata in ${fileName} must contain only static literal values.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
