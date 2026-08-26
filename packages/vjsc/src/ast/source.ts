export interface SourceEdit {
  readonly start: number;
  readonly end: number;
  readonly content: string;
}

export interface SourceText {
  readonly code: string;
  readonly edits: readonly SourceEdit[];
}

export interface RenderedSourceRange {
  readonly value: string;
  position(original: number): number | undefined;
}

export function createSourceText(code: string, edits: readonly SourceEdit[] = []): SourceText {
  return { code, edits: [...edits].sort((left, right) => left.start - right.start) };
}

export function renderSourceRange(source: SourceText, start: number, end: number): RenderedSourceRange {
  const edits = source.edits.filter((edit) => edit.end > start && edit.start < end);
  let cursor = start;
  let value = '';

  for (const edit of edits) {
    if (edit.start < cursor || edit.end > end) {
      throw new Error('vjsc: source edits must be non-overlapping and contained by the rendered range.');
    }

    value += source.code.slice(cursor, edit.start) + edit.content;
    cursor = edit.end;
  }

  value += source.code.slice(cursor, end);

  return {
    value,
    position(original) {
      if (original < start || original > end) return undefined;

      let position = original - start;

      for (const edit of edits) {
        if (edit.end <= original) {
          position += edit.content.length - (edit.end - edit.start);
          continue;
        }

        if (edit.start < original) return undefined;

        break;
      }

      return position;
    },
  };
}

export function sliceSource(source: SourceText, start: number, end: number): string {
  return renderSourceRange(source, start, end).value;
}
