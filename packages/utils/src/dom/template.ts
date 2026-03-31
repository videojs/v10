/** Create an `HTMLTemplateElement` from an HTML string, or `null` when `document` is unavailable (SSR). */
export function createTemplate(html: string): HTMLTemplateElement | null {
  const doc = globalThis.document;
  if (!doc) return null;

  const template = doc.createElement('template');
  template.innerHTML = html;
  return template;
}
