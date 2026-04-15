export type ShadowStyle = CSSStyleSheet | string;

/** Inject a `<style>` tag into `document.head` once (idempotent by `id`). */
export function ensureGlobalStyle(id: string, css: string): void {
  if (!__BROWSER__) return;
  if (document.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

function isConstructableStyleSheet(value: ShadowStyle): value is CSSStyleSheet {
  return __BROWSER__ && typeof CSSStyleSheet !== 'undefined' && value instanceof CSSStyleSheet;
}

function getStyleText(style: ShadowStyle): string {
  if (typeof style === 'string') return style;

  return Array.from(style.cssRules)
    .map((rule) => rule.cssText)
    .join('\n');
}

/** Create a constructable stylesheet when available, otherwise return raw CSS. */
export function createShadowStyle(css: string): ShadowStyle {
  if (!__BROWSER__ || typeof CSSStyleSheet === 'undefined') {
    return css;
  }

  const sheet = new CSSStyleSheet();
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
