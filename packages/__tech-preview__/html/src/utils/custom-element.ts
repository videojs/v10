export function defineCustomElement(tagName: string, ctor: CustomElementConstructor): void {
  if (typeof window === 'undefined') return;

  if (window.customElements.get(tagName)) return;

  window.customElements.define(tagName, ctor);
}
