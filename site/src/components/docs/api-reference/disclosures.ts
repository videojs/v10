const ROW_SELECTOR = '[data-apiref-row], [data-preset-row]';
const TOGGLE_SELECTOR = '[data-apiref-toggle], [data-preset-toggle]';

declare global {
  interface Window {
    __videojsTableDisclosureController?: AbortController;
  }
}

function setExpanded(button: HTMLButtonElement, expanded: boolean): void {
  button.setAttribute('aria-expanded', String(expanded));

  const row = button.closest<HTMLElement>(ROW_SELECTOR);

  row?.toggleAttribute('data-expanded', expanded);

  const controlledId = button.getAttribute('aria-controls');
  const controlled = controlledId ? document.getElementById(controlledId) : null;
  const panel = controlled?.querySelector<HTMLElement>('[data-apiref-detail]');

  if (controlled && panel) {
    controlled.toggleAttribute('inert', !expanded);
    controlled.setAttribute('aria-hidden', String(!expanded));
  } else if (controlled) {
    controlled.hidden = !expanded;
  }
}

function toggle(button: HTMLButtonElement): void {
  setExpanded(button, button.getAttribute('aria-expanded') !== 'true');
}

function handleClick(event: MouseEvent): void {
  if (!(event.target instanceof Element)) return;

  const button = event.target.closest<HTMLButtonElement>(TOGGLE_SELECTOR);

  if (button) {
    toggle(button);

    return;
  }

  if (event.target.closest('a, button, [data-apiref-detail]')) return;

  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) return;

  const row = event.target.closest<HTMLElement>(ROW_SELECTOR);

  row?.querySelector<HTMLButtonElement>(TOGGLE_SELECTOR)?.click();
}

function expandHashTarget(): void {
  if (!window.location.hash) return;

  let id: string;

  try {
    id = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }

  const row = document.getElementById(id)?.closest<HTMLElement>(ROW_SELECTOR);
  const button = row?.querySelector<HTMLButtonElement>(TOGGLE_SELECTOR);

  if (button) setExpanded(button, true);
}

/** Keep table disclosures interactive across Astro document swaps and reveal directly linked rows. */
export function initializeTableDisclosures(): void {
  window.__videojsTableDisclosureController?.abort();

  const controller = new AbortController();
  const { signal } = controller;

  window.__videojsTableDisclosureController = controller;

  document.addEventListener('click', handleClick, { signal });
  document.addEventListener('astro:page-load', expandHashTarget, { signal });
  window.addEventListener('hashchange', expandHashTarget, { signal });

  expandHashTarget();
}
