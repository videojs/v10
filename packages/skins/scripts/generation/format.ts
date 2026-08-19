import { format } from 'oxfmt';
import ts from 'typescript';
import type { GeneratedFile } from 'vjsc/generate';

export async function formatGeneratedFile({ path, content }: GeneratedFile): Promise<string> {
  const result = await format(path, content, {
    printWidth: 120,
    singleQuote: true,
    htmlWhitespaceSensitivity: 'ignore',
  });

  if (result.errors.length > 0) throw new Error(result.errors.map((error) => error.message).join('\n'));

  return isTypeScriptSource(path) ? separateTopLevelStatements(path, result.code) : result.code;
}

function separateTopLevelStatements(path: string, source: string): string {
  // Oxfmt preserves top-level spacing but does not add it to compiler output.
  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const edits: Array<{ start: number; end: number }> = [];

  for (let index = 0; index < sourceFile.statements.length - 1; index++) {
    const current = sourceFile.statements[index];
    const next = sourceFile.statements[index + 1];
    if (!current || !next || (ts.isImportDeclaration(current) && ts.isImportDeclaration(next))) continue;

    const start = current.getEnd();
    let end = start;
    while (end < next.getStart(sourceFile) && /\s/.test(source[end] ?? '')) end++;
    const separator = source.slice(start, end);
    if (separator.trim() || /\r?\n[\t ]*\r?\n/.test(separator)) continue;
    edits.push({ start, end });
  }

  let output = source;
  for (const edit of edits.reverse()) output = `${output.slice(0, edit.start)}\n\n${output.slice(edit.end)}`;
  return output;
}

function isTypeScriptSource(path: string): boolean {
  return /\.(?:[cm]?ts|tsx)$/.test(path);
}
