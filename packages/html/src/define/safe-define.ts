type DefinableElement = CustomElementConstructor & { tagName: string };

/** Define a custom element only if not already registered. */
export function safeDefine(element: DefinableElement): void {
  if (!customElements.get(element.tagName)) {
    customElements.define(element.tagName, element);
  }
}
