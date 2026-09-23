/**
 * Text passes over generated Markdown, shared by the llms-markdown integration and the package docs script. Both run
 * after conversion, so they must leave fenced code untouched.
 */

/** A fenced block as Turndown and the `highlighted-code` rule write it, possibly indented under a list item. */
const CODE_FENCE = /^[ \t]*(`{3,})[^\n]*\n[\s\S]*?\n[ \t]*\1[ \t]*$/gm;

/** A `cli:framework` branch; the backreference pairs each opening marker with its own close. */
const FRAMEWORK_BRANCH = /^[ \t]*<!-- cli:framework (\S+) -->\n([\s\S]*?)\n[ \t]*<!-- \/cli:framework \1 -->[ \t]*$/gm;

const CLI_MARKER = /^[ \t]*<!-- \/?cli:\w+ \S+ -->[ \t]*$/gm;

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

/**
 * Docs CLI markers let one shared page serve every framework. Output that belongs to one framework keeps only its
 * branches, as the CLI does, and drops the markers, which only the docs CLI reads.
 */
export function selectFrameworkBranches(markdown: string, framework: string): string {
  const selected = markdown.replace(FRAMEWORK_BRANCH, (_match, candidate: string, content: string) =>
    candidate === framework ? content : ''
  );

  return outsideCodeFences(selected, (text) => text.replace(CLI_MARKER, '').replace(/\n{3,}/g, '\n\n'));
}
