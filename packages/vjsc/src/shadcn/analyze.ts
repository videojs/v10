import ts from 'typescript';

import { sourceScriptKind } from '../ts/utils/source-module';

export interface ImportReference {
  readonly specifier: string;
  readonly kind: 'static' | 'dynamic' | 'type';
  readonly start: number;
  readonly end: number;
  readonly quote: string;
}

export interface ImportReplacement extends ImportReference {
  readonly replacement: string;
}

/** Locate editable ESM import specifiers without changing source formatting. */
export function analyzeImports(source: string, fileName: string): ImportReference[] {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, sourceScriptKind(fileName));
  const references: ImportReference[] = [];
  const visit = (node: ts.Node): void => {
    const reference = importReference(node);
    if (reference) {
      const { literal, kind } = reference;
      const start = literal.getStart(sourceFile);
      references.push({
        specifier: literal.text,
        kind,
        start,
        end: literal.getEnd(),
        quote: source[start] === '`' ? '`' : source[start] === '"' ? '"' : "'",
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return references;
}

/** Replace import specifiers while preserving all other authored source text. */
export function replaceImportSpecifiers(source: string, replacements: readonly ImportReplacement[]): string {
  let output = source;
  for (const replacement of [...replacements].sort((left, right) => right.start - left.start)) {
    output =
      output.slice(0, replacement.start) +
      replacement.quote +
      escapeSpecifier(replacement.replacement, replacement.quote) +
      replacement.quote +
      output.slice(replacement.end);
  }
  return output;
}

interface ParsedImportReference {
  readonly literal: ts.StringLiteralLike;
  readonly kind: ImportReference['kind'];
}

function importReference(node: ts.Node): ParsedImportReference | undefined {
  if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) {
    return {
      literal: node.moduleSpecifier,
      kind: isTypeOnlyImport(node) ? 'type' : 'static',
    };
  }
  if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) {
    return {
      literal: node.moduleSpecifier,
      kind: isTypeOnlyExport(node) ? 'type' : 'static',
    };
  }
  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1 &&
    ts.isStringLiteralLike(node.arguments[0]!)
  ) {
    return { literal: node.arguments[0], kind: 'dynamic' };
  }
  if (
    ts.isImportTypeNode(node) &&
    ts.isLiteralTypeNode(node.argument) &&
    ts.isStringLiteralLike(node.argument.literal)
  ) {
    return { literal: node.argument.literal, kind: 'type' };
  }
  return undefined;
}

function escapeSpecifier(specifier: string, quote: string): string {
  return specifier.replaceAll('\\', '\\\\').replaceAll(quote, `\\${quote}`);
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
  const clause = node.importClause;
  if (!clause) return false;
  if (clause.isTypeOnly) return true;
  const bindings = clause.namedBindings;
  return Boolean(
    !clause.name &&
      bindings &&
      ts.isNamedImports(bindings) &&
      bindings.elements.length > 0 &&
      bindings.elements.every((element) => element.isTypeOnly)
  );
}

function isTypeOnlyExport(node: ts.ExportDeclaration): boolean {
  if (node.isTypeOnly) return true;
  const clause = node.exportClause;
  return Boolean(
    clause &&
      ts.isNamedExports(clause) &&
      clause.elements.length > 0 &&
      clause.elements.every((element) => element.isTypeOnly)
  );
}
