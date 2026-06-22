import ts from 'typescript';

export interface ParseOptions {
  filename?: string | undefined;
}

export interface ParseResult {
  ast: ts.SourceFile;
}

/**
 * Parse a constrained-JSX skin source into a TypeScript SourceFile.
 *
 * The parser is intentionally thin — `ts.createSourceFile` configured for TSX
 * with parent pointers set so transforms can walk back up the tree.
 */
export function parse(source: string, options: ParseOptions = {}): ParseResult {
  const filename = options.filename ?? 'input.tsx';

  const ast = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    ts.ScriptKind.TSX
  );

  return { ast };
}
