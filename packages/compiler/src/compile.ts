import ts from 'typescript';
import { parse } from './parse';
import { dropUnusedImports } from './transforms/drop-unused-imports';
import { dropUnusedLocals } from './transforms/drop-unused-locals';
import { type ImportRule, transformImports } from './transforms/imports';

export type CompileTarget = 'react' | 'html';

export interface CompileOptions {
  filename?: string | undefined;
  target: CompileTarget;
  /** Per-source-module rewrite rules. See `ImportRule`. */
  imports?: Record<string, ImportRule> | undefined;
  /** Additional TS transformers, applied after `transformImports`, in array order. */
  plugins?: readonly ts.TransformerFactory<ts.SourceFile>[] | undefined;
  /** Directory relative paths in `imports` rules resolve against. Typically the compiler.config.js dir. */
  configDir?: string | undefined;
  /** Output file path (used to project relative-path import targets). */
  outputFile?: string | undefined;
}

export interface CompileResult {
  code: string;
  map?: unknown;
}

const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: false,
});

/**
 * Compile a constrained-JSX skin to a target-flavored TSX module.
 *
 * 1. Parse the source into a TSX SourceFile.
 * 2. Apply `transformImports(opts.imports)` so cross-package symbols re-route.
 * 3. Apply each `opts.plugins` transformer in order (target-specific lowering).
 * 4. Print to a string, then insert blank lines between top-level statements
 *    so the artifact stays skim-readable. The consumer's formatter (Biome)
 *    handles indentation/quotes/import grouping but won't *add* blank lines
 *    that aren't already present, so we seed them here.
 */
export function compile(source: string, options: CompileOptions): CompileResult {
  const { ast } = parse(source, { filename: options.filename });
  const transformers: ts.TransformerFactory<ts.SourceFile>[] = [];

  if (options.imports) {
    transformers.push(
      transformImports({
        rules: options.imports,
        configDir: options.configDir,
        outputFile: options.outputFile,
      })
    );
  }

  if (options.plugins) transformers.push(...options.plugins);

  // Final passes: prune locals the rewrites left behind, then prune imports.
  // Order matters — dropping a local may make the imports it referenced
  // unused. Always run when any transformer ran.
  if (transformers.length > 0) {
    transformers.push(dropUnusedLocals());
    transformers.push(dropUnusedImports());
  }

  if (transformers.length === 0) {
    return { code: separateTopLevel(printer.printFile(ast)) };
  }

  const result = ts.transform(ast, transformers as ts.TransformerFactory<ts.SourceFile>[]);
  const transformed = result.transformed[0]!;
  const code = separateTopLevel(printer.printFile(transformed));

  result.dispose();

  return { code };
}

/**
 * Insert blank lines between top-level statements so the printer's dense
 * output is at least readable. Biome will normalize quote/indent/import
 * style on top of this; it doesn't add blank lines, so we do.
 *
 * Heuristic: at column 0, a blank line goes between any two adjacent
 * non-blank lines that look like the boundary between top-level constructs:
 *
 *   - after the last `import` line (before non-import code)
 *   - between a `}` (end of function/class/interface/etc.) and the next
 *     top-level token
 *   - between `<decl>;` and the next top-level token (covers consts/types)
 *   - before a leading-comment block that introduces a top-level decl
 */
function separateTopLevel(code: string): string {
  const lines = code.split('\n');
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    out.push(line);
    const next = lines[i + 1];
    if (next === undefined || next === '') continue;

    if (isTopLevelBoundary(line, next)) out.push('');
  }
  return out.join('\n');
}

function isTopLevelBoundary(line: string, next: string): boolean {
  // Only consider column-0 boundaries; nested blocks shouldn't get blank lines.
  if (line.startsWith(' ') || line.startsWith('\t')) return false;
  if (next.startsWith(' ') || next.startsWith('\t')) return false;

  const isImport = (s: string) => s.startsWith('import ') || s.startsWith('import{');
  const startsTopLevel = (s: string) =>
    /^(export\s+(default\s+)?)?(function|class|const|let|var|interface|type|enum|namespace|async\s+function)\b/.test(
      s
    ) ||
    s.startsWith('//') ||
    s.startsWith('/*');

  // Boundary: end of an import block.
  if (isImport(line) && !isImport(next)) return true;

  // Boundary: end of a top-level block (`}`) → start of another decl.
  if (line === '}' && startsTopLevel(next)) return true;

  // Boundary: end-of-statement (`;`) at col 0 → start of another decl.
  if (line.endsWith(';') && startsTopLevel(next)) return true;

  return false;
}
