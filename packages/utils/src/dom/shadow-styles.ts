export type ShadowStyle = CSSStyleSheet | string;

/** Inject a `<style>` tag into `document.head` once (idempotent by `id`). */
export function ensureGlobalStyle(id: string, css: string): void {
  const doc = globalThis.document;
  if (!doc || doc.getElementById(id)) return;

  const style = doc.createElement('style');
  style.id = id;
  style.textContent = css;
  doc.head.appendChild(style);
}

function isConstructableStyleSheet(value: ShadowStyle): value is CSSStyleSheet {
  return typeof globalThis.CSSStyleSheet !== 'undefined' && value instanceof globalThis.CSSStyleSheet;
}

function getStyleText(style: ShadowStyle): string {
  if (typeof style === 'string') return style;

  return Array.from(style.cssRules)
    .map((rule) => rule.cssText)
    .join('\n');
}

/** Create a constructable stylesheet when available, otherwise return raw CSS. */
export function createShadowStyle(css: string): ShadowStyle {
  if (typeof globalThis.CSSStyleSheet === 'undefined') {
    return css;
  }

  const sheet = new globalThis.CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
}

/** Apply styles to a shadow root using `adoptedStyleSheets` when available, falling back to `<style>` injection. */
export function applyShadowStyles(shadowRoot: ShadowRoot, styles: ShadowStyle[]): void {
  if (styles.every(isConstructableStyleSheet) && 'adoptedStyleSheets' in shadowRoot) {
    shadowRoot.adoptedStyleSheets = styles;
    return;
  }

  const doc = shadowRoot.ownerDocument;
  for (const styleText of styles.map(getStyleText)) {
    const style = doc.createElement('style');
    style.textContent = styleText;
    shadowRoot.appendChild(style);
  }
}
