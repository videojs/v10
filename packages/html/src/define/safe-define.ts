type DefinableElement = CustomElementConstructor & { tagName: string };

/**
 * Define a custom element only if not already registered.
 *
 * `tagName` overrides the element's own, for the rare case of registering one
 * element under a second name — two flavors of the same element in one runtime,
 * say, where whichever registers first would otherwise take the name and the
 * other would silently lose it. Registering under the override does not change
 * `element.tagName`, so anything reading the class still sees its standard name.
 */
export function safeDefine(element: DefinableElement, tagName: string = element.tagName): void {
  const registry = globalThis.customElements;
  if (!registry || registry.get(tagName)) return;

  registry.define(tagName, element);
}
