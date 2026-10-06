const CODE_FENCE_OPEN = /^[ \t]*(`{3,}|~{3,})/;
const CODE_FENCE_CLOSE = /^[ \t]*(`{3,}|~{3,})[ \t]*(?:\r?\n)?$/;

/** Return a Markdown fence marker, including its character and opening length. */
export function codeFenceOpening(line: string): string | null {
  return line.match(CODE_FENCE_OPEN)?.[1] ?? null;
}

/** Markdown permits a closing fence to be longer than its matching opening fence. */
export function closesCodeFence(line: string, opening: string): boolean {
  const closing = line.match(CODE_FENCE_CLOSE)?.[1];

  return closing?.[0] === opening[0] && closing.length >= opening.length;
}

/** Apply `transform` to the Markdown between fenced code blocks, whose text must reach the reader verbatim. */
export function outsideCodeFences(markdown: string, transform: (text: string) => string): string {
  let result = '';
  let outside = '';
  let fence: string | null = null;

  for (const line of markdown.match(/[^\r\n]*(?:\r\n|\n|$)/g)?.filter(Boolean) ?? []) {
    if (fence) {
      result += line;

      if (closesCodeFence(line, fence)) fence = null;

      continue;
    }

    const opening = codeFenceOpening(line);

    if (!opening) {
      outside += line;
      continue;
    }

    result += transform(outside) + line;
    outside = '';
    fence = opening;
  }

  return result + transform(outside);
}
