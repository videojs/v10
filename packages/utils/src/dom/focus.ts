const TABBABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'audio[controls]',
  'video[controls]',
  'iframe',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function getDeepActiveElement(root: Document | ShadowRoot = document): Element | null {
  let active = root.activeElement;

  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }

  return active;
}

/** Returns the elements in a subtree that participate in sequential keyboard navigation. */
export function getTabbableElements(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR)).filter(isTabbableElement);
}

function isTabbableElement(element: HTMLElement): boolean {
  if (element.tabIndex < 0 || element.hidden || element.matches(':disabled')) return false;
  if (element.closest('[inert],[hidden],[aria-hidden="true"]')) return false;
  return true;
}
