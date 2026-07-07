import { kebabCase } from '../string/casing';

export function applyStyles(element: HTMLElement, styles: Record<string, string | undefined>): void {
  for (const [prop, value] of Object.entries(styles)) {
    if (typeof value === 'string') {
      // CSS custom properties (--*) are already in the correct format.
      const key = prop.startsWith('--') ? prop : kebabCase(prop);
      element.style.setProperty(key, value);
    }
  }
}

export function resolveCSSLength(el: Element, value: string): number {
  const trimmed = value.trim();

  if (!trimmed) return 0;

  const parsed = Number.parseFloat(trimmed);

  if (!Number.isNaN(parsed) && (/^-?\d*\.?\d+$/.test(trimmed) || trimmed.endsWith('px'))) return parsed;

  const doc = el.ownerDocument;
  const root = doc?.documentElement;

  if (!Number.isNaN(parsed) && trimmed.endsWith('rem')) {
    const rootFontSize = root ? Number.parseFloat(getComputedStyle(root).fontSize) || 16 : 16;
    return parsed * rootFontSize;
  }

  if (!Number.isNaN(parsed) && trimmed.endsWith('em')) {
    const fontSize = el instanceof HTMLElement ? Number.parseFloat(getComputedStyle(el).fontSize) || 16 : 16;
    return parsed * fontSize;
  }

  if (!doc) return Number.isNaN(parsed) ? 0 : parsed;

  const measurementEl = doc.createElement('div');
  measurementEl.style.position = 'absolute';
  measurementEl.style.visibility = 'hidden';
  measurementEl.style.pointerEvents = 'none';
  measurementEl.style.inlineSize = trimmed;

  if (!measurementEl.style.inlineSize) return 0;

  measurementEl.style.blockSize = '0';
  measurementEl.style.padding = '0';
  measurementEl.style.border = '0';
  measurementEl.style.inset = '0';

  const computed = getComputedStyle(el);
  measurementEl.style.fontSize = computed.fontSize;

  for (let i = 0; i < computed.length; i++) {
    const name = computed.item(i);

    if (name.startsWith('--')) {
      measurementEl.style.setProperty(name, computed.getPropertyValue(name));
    }
  }

  const parent = doc.body ?? doc.documentElement;

  if (!parent) return Number.isNaN(parsed) ? 0 : parsed;

  parent.appendChild(measurementEl);

  if (getComputedStyle(measurementEl).inlineSize === 'auto') {
    measurementEl.remove();
    return 0;
  }

  const pixels = measurementEl.getBoundingClientRect().width;
  measurementEl.remove();

  if (Number.isFinite(pixels)) return pixels;

  return Number.isNaN(parsed) ? 0 : parsed;
}
