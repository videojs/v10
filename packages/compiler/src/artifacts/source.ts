import { stat } from 'node:fs/promises';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { collectReferencedIdentifiers } from '../utils/references';

interface ModuleReference {
  source: string;
  node: ts.StringLiteralLike;
  names: readonly string[];
  ambiguous: boolean;
}

export function parseArtifactSource(fileName: string, sourceText: string): ts.SourceFile {
  return ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.Latest, true, scriptKind(fileName));
}

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

export async function resolveImportedFile(importer: string, source: string): Promise<string | null> {
  const base = resolve(dirname(importer), source);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
  ];

  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      // Continue through the deterministic resolution candidates.
    }
  }
  return null;
}

const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);

export function isSourceFile(fileName: string): boolean {
  return sourceExtensions.has(extname(fileName));
}

export function packageNameFromSpecifier(source: string): string {
  if (!source.startsWith('@')) return source.split('/')[0]!;
  return source.split('/').slice(0, 2).join('/');
}

export function graphPath(rootDir: string, fileName: string): string {
  return `./${relative(rootDir, fileName).split(sep).join('/').replaceAll('\\', '/')}`;
}

export function isWithinRoot(rootDir: string, fileName: string): boolean {
  const path = relative(rootDir, fileName);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

function scriptKind(fileName: string): ts.ScriptKind {
  switch (extname(fileName)) {
    case '.tsx':
      return ts.ScriptKind.TSX;
    case '.jsx':
      return ts.ScriptKind.JSX;
    case '.js':
    case '.mjs':
    case '.cjs':
      return ts.ScriptKind.JS;
    default:
      return ts.ScriptKind.TS;
  }
}
