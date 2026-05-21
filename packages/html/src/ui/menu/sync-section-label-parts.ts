/** Sets text on `[data-part~="section-label"]` for menu section titles (settings row / back heading). */
export function syncSectionLabelParts(root: HTMLElement | ShadowRoot, text: string): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-part~="section-label"]')) {
    el.textContent = text;
  }
}
