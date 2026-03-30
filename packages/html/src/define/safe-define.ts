type DefinableElement = CustomElementConstructor & { tagName: string };

/** Define a custom element only if not already registered. */
export function safeDefine(element: DefinableElement): void {
  const registry = globalThis.customElements;
  if (!registry || registry.get(element.tagName)) return;

  registry.define(element.tagName, element);
}
