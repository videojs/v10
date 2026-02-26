/** Apply a record of style properties to an element. */
export function applyStyles(element: HTMLElement, styles: Record<string, string>): void {
  for (const [prop, value] of Object.entries(styles)) {
    element.style.setProperty(prop, value);
  }
}
