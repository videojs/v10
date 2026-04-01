/** Create an `HTMLTemplateElement` from an HTML string, or `null` when `document` is unavailable (SSR). */
export function createTemplate(html: string): HTMLTemplateElement | null {
  const doc = globalThis.document;
  if (!doc) return null;

  const template = doc.createElement('template');
  template.innerHTML = html;
  return template;
}

/** Deep-clone a template's content into a container. */
export function renderTemplate(container: Element | ShadowRoot, template: HTMLTemplateElement): void {
  container.appendChild(container.ownerDocument.importNode(template.content, true));
}
