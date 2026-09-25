declare global {
  interface Window {
    __videojsDocsSectionTabsController?: AbortController;
  }
}

const TABLIST_SELECTOR = '[data-docs-section-tabs]';

function findTab(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>(`${TABLIST_SELECTOR} [role="tab"]`) : null;
}

function getTabs(tablist: Element): HTMLElement[] {
  return Array.from(tablist.querySelectorAll<HTMLElement>('[role="tab"]'));
}

/** Show one section's tree in place of the others, without leaving the current page. */
export function selectDocsSectionTab(tab: HTMLElement, focus = false): void {
  const tablist = tab.closest(TABLIST_SELECTOR);
  if (!tablist) return;

  const update = () => {
    for (const candidate of getTabs(tablist)) {
      const selected = candidate === tab;
      const panelId = candidate.getAttribute('aria-controls');
      const panel = panelId ? document.getElementById(panelId) : null;

      candidate.setAttribute('aria-selected', String(selected));
      candidate.tabIndex = selected ? 0 : -1;
      panel?.toggleAttribute('hidden', !selected);
    }

    if (focus) tab.focus();
  };

  if (!('startViewTransition' in document)) {
    update();
    return;
  }

  // Name the pill and labels for this transition only where the sidebar doesn't already keep the names, so the pill
  // slides to the new tab. See `DocsSidebar` for why not every sidebar keeps them.
  const lent = Array.from(tablist.querySelectorAll<HTMLElement>('[data-docs-tab-transition]')).filter(
    (element) => !element.style.viewTransitionName
  );

  for (const element of lent) element.style.viewTransitionName = element.dataset.docsTabTransition ?? '';

  document.startViewTransition(update).finished.finally(() => {
    for (const element of lent) element.style.viewTransitionName = '';
  });
}

function handleClick(event: MouseEvent): void {
  const tab = findTab(event.target);

  if (tab) selectDocsSectionTab(tab);
}

// Arrow keys move and select together; each switch only toggles `hidden`, so there is nothing to defer.
function handleKeydown(event: KeyboardEvent): void {
  const tab = findTab(event.target);
  const tablist = tab?.closest(TABLIST_SELECTOR);
  if (!tab || !tablist) return;

  const tabs = getTabs(tablist);
  const index = tabs.indexOf(tab);
  let next: HTMLElement | undefined;

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      next = tabs[(index + 1) % tabs.length];
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      next = tabs[(index - 1 + tabs.length) % tabs.length];
      break;
    case 'Home':
      next = tabs[0];
      break;
    case 'End':
      next = tabs.at(-1);
      break;
  }

  if (!next) return;

  event.preventDefault();
  selectDocsSectionTab(next, true);
}

/** Delegate from the document so sidebars swapped in by client-side navigation work without rebinding. */
export function initializeDocsSectionTabs(): void {
  window.__videojsDocsSectionTabsController?.abort();

  const controller = new AbortController();
  const { signal } = controller;

  window.__videojsDocsSectionTabsController = controller;

  document.addEventListener('click', handleClick, { signal });
  document.addEventListener('keydown', handleKeydown, { signal });
}
