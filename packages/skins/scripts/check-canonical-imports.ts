import { globSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

const DEFAULT_CANONICAL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../canonical');

export const CANONICAL_PACKAGE_IMPORTS: ReadonlySet<string> = new Set([
  '@videojs/core',
  '@videojs/core/components',
  '@videojs/icons/components',
  '@videojs/jsx',
]);

export interface CanonicalImportViolation {
  file: string;
  line: number;
  column: number;
  source: string;
  reason: 'outside-canonical-root' | 'package-not-allowed';
}

export interface CanonicalImportCheckResult {
  files: number;
  violations: readonly CanonicalImportViolation[];
}

function isWithinRoot(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

function moduleSpecifier(node: ts.Node): ts.StringLiteralLike | null {
  if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
    return ts.isStringLiteralLike(node.moduleSpecifier) ? node.moduleSpecifier : null;
  }

  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1 &&
    ts.isStringLiteralLike(node.arguments[0]!)
  ) {
    return node.arguments[0]!;
  }

  if (
    ts.isImportTypeNode(node) &&
    ts.isLiteralTypeNode(node.argument) &&
    ts.isStringLiteralLike(node.argument.literal)
  ) {
    return node.argument.literal;
  }

  return null;
}

function violationForSource(
  canonicalRoot: string,
  file: string,
  source: string
): CanonicalImportViolation['reason'] | null {
  if (source.startsWith('.')) {
    return isWithinRoot(canonicalRoot, resolve(dirname(file), source)) ? null : 'outside-canonical-root';
  }

  return CANONICAL_PACKAGE_IMPORTS.has(source) ? null : 'package-not-allowed';
}

export function checkCanonicalImports(canonicalRoot = DEFAULT_CANONICAL_ROOT): CanonicalImportCheckResult {
  const files = globSync('**/*.{ts,tsx}', { cwd: canonicalRoot })
    .map((file) => resolve(canonicalRoot, file))
    .sort();
  const violations: CanonicalImportViolation[] = [];

  for (const file of files) {
    const sourceText = readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    const visit = (node: ts.Node): void => {
      const specifier = moduleSpecifier(node);
      if (specifier) {
        const reason = violationForSource(canonicalRoot, file, specifier.text);
        if (reason) {
          const location = sourceFile.getLineAndCharacterOfPosition(specifier.getStart(sourceFile));
          violations.push({
            file,
            line: location.line + 1,
            column: location.character + 1,
            source: specifier.text,
            reason,
          });
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
  }

  return { files: files.length, violations };
}

function run(): void {
  const result = checkCanonicalImports();
  if (result.violations.length === 0) {
    process.stdout.write(`Checked ${result.files} canonical source files.\n`);
    return;
  }

  for (const violation of result.violations) {
    process.stderr.write(
      `${relative(process.cwd(), violation.file)}:${violation.line}:${violation.column} ${violation.source}: ${violation.reason}\n`
    );
  }
  process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) run();
