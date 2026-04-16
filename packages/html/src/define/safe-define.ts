type DefinableElement = CustomElementConstructor & { tagName: string };

/** Define a custom element only if not already registered. */
export function safeDefine(element: DefinableElement): void {
  if (!__BROWSER__) return;
  if (customElements.get(element.tagName)) return;

  customElements.define(element.tagName, element);
}
