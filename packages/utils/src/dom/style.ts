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

  if (Number.isNaN(parsed)) return 0;
  if (/^-?\d*\.?\d+$/.test(trimmed) || trimmed.endsWith('px')) return parsed;

  const doc = el.ownerDocument;
  const root = doc?.documentElement;

  if (trimmed.endsWith('rem')) {
    const rootFontSize = root ? Number.parseFloat(getComputedStyle(root).fontSize) || 16 : 16;
    return parsed * rootFontSize;
  }

  if (trimmed.endsWith('em')) {
    const fontSize = el instanceof HTMLElement ? Number.parseFloat(getComputedStyle(el).fontSize) || 16 : 16;
    return parsed * fontSize;
  }

  if (!doc) return parsed;

  const measurementEl = doc.createElement('div');
  measurementEl.style.position = 'absolute';
  measurementEl.style.visibility = 'hidden';
  measurementEl.style.pointerEvents = 'none';
  measurementEl.style.inlineSize = trimmed;
  measurementEl.style.blockSize = '0';
  measurementEl.style.padding = '0';
  measurementEl.style.border = '0';
  measurementEl.style.inset = '0';

  const parent = doc.body ?? doc.documentElement;

  if (!parent) return parsed;

  parent.appendChild(measurementEl);

  const pixels = measurementEl.getBoundingClientRect().width;
  measurementEl.remove();

  return Number.isFinite(pixels) ? pixels : parsed;
}

/** Parses comma-separated CSS time tokens (`<time>#`) used by `transition-*` into milliseconds. */
export function parseCSSTimeList(value: string): number[] {
  return value.split(',').map((part) => {
    const time = part.trim();

    if (time.endsWith('ms')) return Number.parseFloat(time);
    if (time.endsWith('s')) return Number.parseFloat(time) * 1000;

    return 0;
  });
}

/** Longest pairwise sum of computed `transition-duration` and `transition-delay` (milliseconds). */
export function getMaxCSSTransitionTime(element: HTMLElement): number {
  const style = getComputedStyle(element);
  const durations = parseCSSTimeList(style.transitionDuration);
  const delays = parseCSSTimeList(style.transitionDelay);
  const count = Math.max(durations.length, delays.length);
  let max = 0;

  for (let i = 0; i < count; i++) {
    const duration = durations[i % durations.length] ?? 0;
    const delay = delays[i % delays.length] ?? 0;
    max = Math.max(max, duration + delay);
  }

  return max;
}
