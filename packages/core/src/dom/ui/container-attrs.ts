export const DEFAULT_CONTAINER_LABEL = 'Media player';
export const DEFAULT_CONTAINER_ROLE = 'group';
export const DEFAULT_CONTAINER_TAB_INDEX = 0;

export function applyContainerAttrs(element: HTMLElement): void {
  if (!element.hasAttribute('role')) {
    element.setAttribute('role', DEFAULT_CONTAINER_ROLE);
  }

  // Provide a default label so screen readers don't announce the child element labels.
  if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) {
    element.setAttribute('aria-label', DEFAULT_CONTAINER_LABEL);
  }

  // Make it focusable so keyboard events reach the hotkey coordinator's listener.
  if (!element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', String(DEFAULT_CONTAINER_TAB_INDEX));
  }
}
