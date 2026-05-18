/** First non-empty `lang` on `start` or an ancestor (HTML language inheritance). */
export function nearestLang(start: Element | null): string | undefined {
  if (!start || typeof document === 'undefined') {
    return undefined;
  }
  let node: Element | null = start;
  while (node) {
    const trimmed = node.getAttribute('lang')?.trim();
    if (trimmed) {
      return trimmed;
    }
    node = node.parentElement;
  }
  return undefined;
}
