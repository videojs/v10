function readLang(node: Element): string | undefined {
  const fromAttribute = node.getAttribute('lang')?.trim();
  if (fromAttribute) {
    return fromAttribute;
  }
  if ('lang' in node && typeof node.lang === 'string') {
    const fromProperty = node.lang.trim();
    if (fromProperty) {
      return fromProperty;
    }
  }
  return undefined;
}

/** First non-empty `lang` on `start` or an ancestor (HTML language inheritance). */
export function nearestLang(start: Element | null): string | undefined {
  if (!start || typeof document === 'undefined') {
    return undefined;
  }
  let node: Element | null = start;
  while (node) {
    const lang = readLang(node);
    if (lang) {
      return lang;
    }
    node = node.parentElement;
  }
  return undefined;
}
