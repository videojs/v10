export function replaceMarker(markdown: string, id: string, replacement: string): string {
  const re = new RegExp(`<!-- cli:replace ${id} -->\\n[\\s\\S]*?\\n<!-- /cli:replace ${id} -->`);

  return markdown.replace(re, () => replacement);
}

export function stripOmitMarkers(markdown: string): string {
  const re = /\n?<!-- cli:omit \S+ -->\n[\s\S]*?\n<!-- \/cli:omit \S+ -->\n?/g;

  return markdown.replace(re, '\n');
}

/** Keep one named Markdown branch and remove its siblings. */
export function selectMarker(markdown: string, id: string, value: string): string {
  const re = new RegExp(`\n?<!-- cli:${id} (\\S+) -->\n([\\s\\S]*?)\n<!-- /cli:${id} \\1 -->\n?`, 'g');

  return markdown.replace(re, (_match, candidate: string, content: string) => {
    return candidate === value ? `\n${content}\n` : '\n';
  });
}
