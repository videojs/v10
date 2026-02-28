import { kebabCase } from '../string/casing';

export function applyStyles(element: HTMLElement, styles: Record<string, string | undefined>): void {
  for (const [prop, value] of Object.entries(styles)) {
    if (typeof value === 'string') {
      element.style.setProperty(kebabCase(prop), value);
    }
  }
}
