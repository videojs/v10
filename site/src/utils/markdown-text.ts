/** A fenced block as Turndown and the `highlighted-code` rule write it, possibly indented under a list item. */
const CODE_FENCE = /^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n[ \t]*\1[ \t]*$/gm;

/** Apply `transform` to the Markdown between fenced code blocks, whose text must reach the reader verbatim. */
export function outsideCodeFences(markdown: string, transform: (text: string) => string): string {
  let result = '';
  let offset = 0;

  for (const match of markdown.matchAll(CODE_FENCE)) {
    result += transform(markdown.slice(offset, match.index)) + match[0];
    offset = match.index + match[0].length;
  }

  return result + transform(markdown.slice(offset));
}
