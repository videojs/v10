export function replaceMarker(markdown: string, id: string, replacement: string): string {
  const re = new RegExp(`<!-- cli:replace ${id} -->\\n[\\s\\S]*?\\n<!-- /cli:replace ${id} -->`);
  return markdown.replace(re, replacement);
}
