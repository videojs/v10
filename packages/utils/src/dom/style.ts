import { kebabCase } from '../string/casing';

export function applyStyles(element: HTMLElement, styles: Record<string, string>): void {
  for (const [prop, value] of Object.entries(styles)) {
    element.style.setProperty(kebabCase(prop), value);
  }
}
