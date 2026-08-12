import { globSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectModuleReferences } from '@videojs/compiler/ast';
import ts from 'typescript';

const DEFAULT_CANONICAL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../canonical');

const CANONICAL_PACKAGE_IMPORTS: ReadonlySet<string> = new Set([
  '@videojs/core',
  '@videojs/core/components',
  '@videojs/icons/components',
  '@videojs/jsx',
]);

interface CanonicalImportViolation {
  file: string;
  line: number;
  column: number;
  source: string;
  reason: 'outside-canonical-root' | 'package-not-allowed';
}

interface CanonicalImportCheckResult {
  files: number;
  violations: readonly CanonicalImportViolation[];
}

function isWithinRoot(root: string, target: string): boolean {
  const path = relative(root, target);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
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
    .filter((file) => !file.startsWith('registry/default/'))
    .map((file) => resolve(canonicalRoot, file))
    .sort();
  const violations: CanonicalImportViolation[] = [];

  for (const file of files) {
    const sourceText = readFileSync(file, 'utf8');
    const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    for (const reference of collectModuleReferences(sourceFile)) {
      const reason = violationForSource(canonicalRoot, file, reference.source);
      if (!reason) continue;
      const location = sourceFile.getLineAndCharacterOfPosition(reference.node.getStart(sourceFile));
      violations.push({
        file,
        line: location.line + 1,
        column: location.character + 1,
        source: reference.source,
        reason,
      });
    }
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
