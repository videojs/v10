export function replaceMarker(markdown: string, id: string, replacement: string): string {
  const re = new RegExp(`<!-- cli:replace ${id} -->\\n[\\s\\S]*?\\n<!-- /cli:replace ${id} -->`);
  return markdown.replace(re, () => replacement);
}

export function stripOmitMarkers(markdown: string): string {
  const re = /\n?<!-- cli:omit \S+ -->\n[\s\S]*?\n<!-- \/cli:omit \S+ -->\n?/g;
  return markdown.replace(re, '\n');
}
