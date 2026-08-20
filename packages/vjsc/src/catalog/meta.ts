import { globSync, readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

import ts from 'typescript';

import type { CompilerPlugin } from '../config';
import type { GeneratedModule } from '../generate';
import { toPosixPath } from '../utils/path';
import { sourceScriptKind } from '../utils/source-module';
import type { CatalogItemDefinition } from './define';

export interface CatalogItemMeta {
  readonly name: string;
  readonly [key: string]: unknown;
}

export interface DiscoverCatalogItemsOptions {
  readonly rootDir: string;
  readonly files: string | readonly string[];
  readonly exportName?: string | undefined;
}

export interface CatalogItemsModule<Item extends CatalogItemMeta = CatalogItemMeta> extends GeneratedModule {
  readonly items: readonly (Item & CatalogItemDefinition)[];
}

/** Discover self-describing catalog entries without evaluating their source modules. */
export function discoverCatalogItems<Item extends CatalogItemMeta = CatalogItemMeta>(
  options: DiscoverCatalogItemsOptions
): readonly (Item & CatalogItemDefinition)[] {
  const rootDir = resolve(options.rootDir);
  const patterns = typeof options.files === 'string' ? [options.files] : options.files;
  const exportName = options.exportName ?? 'meta';
  const sourceFiles = [
    ...new Set(
      patterns.flatMap((pattern) =>
        globSync(pattern, { cwd: rootDir }).map((path) => (isAbsolute(path) ? path : resolve(rootDir, path)))
      )
    ),
  ].sort();

  const items = sourceFiles.flatMap((fileName) => {
    const meta = findCatalogItemMeta(readFileSync(fileName, 'utf8'), fileName, exportName) as Item | undefined;
    if (!meta) return [];
    if ('source' in meta) throw new Error(`Catalog item metadata in ${fileName} must not declare \`source\`.`);
    const path = toPosixPath(relative(rootDir, fileName));
    return [{ ...meta, source: `./${path}` }];
  });
  const names = new Set<string>();

  for (const item of items) {
    if (names.has(item.name)) throw new Error(`Catalog item \`${item.name}\` is declared more than once.`);
    names.add(item.name);
  }

  return items.sort((left, right) => left.name.localeCompare(right.name));
}

/** Generate the catalog inventory facade consumed by bundlers and editor type sync. */
export function createCatalogItemsModule<Item extends CatalogItemMeta = CatalogItemMeta>(
  options: DiscoverCatalogItemsOptions
): CatalogItemsModule<Item> {
  const items = discoverCatalogItems<Item>(options);

  return {
    items,
    code: `export const items = ${JSON.stringify(items, null, 2)} as const;\nexport default items;\n`,
    watchFiles: items.map((item) => resolve(options.rootDir, item.source)),
  };
}

/** Remove compile-time catalog metadata from projected component modules. */
export function catalogMetaPlugin(exportName = 'meta'): CompilerPlugin {
  return {
    name: 'vjsc:catalog-meta',
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

export function extractCatalogItemMeta(source: string, fileName: string, exportName = 'meta'): CatalogItemMeta {
  const meta = findCatalogItemMeta(source, fileName, exportName);
  if (meta) return meta;
  throw new Error(`Catalog source ${fileName} must export a static \`${exportName}\` object.`);
}

function findCatalogItemMeta(source: string, fileName: string, exportName: string): CatalogItemMeta | undefined {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, sourceScriptKind(fileName));

  for (const statement of sourceFile.statements) {
    if (!isExportedMetaStatement(statement, exportName)) continue;
    const declaration = statement.declarationList.declarations.find(
      (declaration) => ts.isIdentifier(declaration.name) && declaration.name.text === exportName
    );
    if (!declaration?.initializer) break;
    const value = staticValue(declaration.initializer, fileName);
    if (!isRecord(value) || typeof value.name !== 'string' || value.name.length === 0) {
      throw new Error(`Catalog metadata \`${exportName}\` in ${fileName} must contain a non-empty literal \`name\`.`);
    }
    return value as CatalogItemMeta;
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
  return new Error(`Catalog metadata in ${fileName} must contain only static literal values.`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
