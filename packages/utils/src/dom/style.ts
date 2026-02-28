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
