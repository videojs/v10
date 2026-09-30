type DefinableElement = CustomElementConstructor & { tagName: string };

/** Define a custom element only if not already registered. */
export function safeDefine(element: DefinableElement): void {
  const tagName = element.tagName;
  const registry = globalThis.customElements;
  if (!registry || registry.get(tagName)) return;

  registry.define(tagName, element);
}
