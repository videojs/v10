import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { initializeDocsSectionTabs } from '../section-tabs';

function renderSidebar(): void {
  document.body.innerHTML = `
    <div role="tablist" data-docs-section-tabs>
      <button role="tab" id="tab-guides" aria-controls="panel-guides" aria-selected="true" tabindex="0">Guides</button>
      <button role="tab" id="tab-components" aria-controls="panel-components" aria-selected="false" tabindex="-1">Components</button>
      <button role="tab" id="tab-api" aria-controls="panel-api" aria-selected="false" tabindex="-1">API</button>
    </div>
    <div role="tabpanel" id="panel-guides"><a href="/docs/guide">Guide</a></div>
    <div role="tabpanel" id="panel-components" hidden><a href="/docs/component">Component</a></div>
    <div role="tabpanel" id="panel-api" hidden><a href="/docs/api">API</a></div>
  `;
}

function tab(name: string): HTMLElement {
  return document.getElementById(`tab-${name}`)!;
}

function panel(name: string): HTMLElement {
  return document.getElementById(`panel-${name}`)!;
}

function press(target: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

  target.dispatchEvent(event);

  return event;
}

describe('initializeDocsSectionTabs', () => {
  beforeEach(() => {
    renderSidebar();
    initializeDocsSectionTabs();
  });

  afterEach(() => {
    window.__videojsDocsSectionTabsController?.abort();
    delete window.__videojsDocsSectionTabsController;
    document.body.replaceChildren();
  });

  it('shows the clicked section without navigating', () => {
    const initialUrl = window.location.href;

    tab('components').click();

    expect(tab('components').getAttribute('aria-selected')).toBe('true');
    expect(tab('components').tabIndex).toBe(0);
    expect(tab('guides').getAttribute('aria-selected')).toBe('false');
    expect(tab('guides').tabIndex).toBe(-1);
    expect(panel('components').hidden).toBe(false);
    expect(panel('guides').hidden).toBe(true);
    expect(panel('api').hidden).toBe(true);
    expect(window.location.href).toBe(initialUrl);
  });

  it('moves selection and focus with arrow keys, wrapping at the ends', () => {
    tab('guides').focus();

    const event = press(tab('guides'), 'ArrowDown');

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(tab('components'));
    expect(panel('components').hidden).toBe(false);

    press(tab('components'), 'End');
    expect(document.activeElement).toBe(tab('api'));

    press(tab('api'), 'ArrowDown');
    expect(document.activeElement).toBe(tab('guides'));

    press(tab('guides'), 'ArrowUp');
    expect(document.activeElement).toBe(tab('api'));
    expect(panel('api').hidden).toBe(false);
  });

  it('ignores keys that do not move between tabs', () => {
    const event = press(tab('guides'), 'Enter');

    expect(event.defaultPrevented).toBe(false);
    expect(panel('guides').hidden).toBe(false);
  });

  it('lends transition names for an in-place switch and keeps names a sidebar already owns', async () => {
    const tablist = document.querySelector('[data-docs-section-tabs]')!;

    tablist.insertAdjacentHTML(
      'beforeend',
      `<span data-docs-tab-transition="sidebar-tab-pill"></span>
       <span data-docs-tab-transition="sidebar-tab-guides" style="view-transition-name: sidebar-tab-guides"></span>`
    );

    const [lent, owned] = tablist.querySelectorAll<HTMLElement>('[data-docs-tab-transition]');
    let finish!: () => void;
    let namesDuringTransition: string[] = [];
    const startViewTransition = vi.fn((update: () => void) => {
      namesDuringTransition = [lent!.style.viewTransitionName, owned!.style.viewTransitionName];
      update();

      return { finished: new Promise<void>((resolve) => (finish = resolve)) };
    });

    Object.assign(document, { startViewTransition });

    try {
      tab('api').click();

      expect(startViewTransition).toHaveBeenCalledOnce();
      expect(namesDuringTransition).toEqual(['sidebar-tab-pill', 'sidebar-tab-guides']);
      expect(panel('api').hidden).toBe(false);

      finish();
      await vi.waitFor(() => expect(lent!.style.viewTransitionName).toBe(''));
      expect(owned!.style.viewTransitionName).toBe('sidebar-tab-guides');
    } finally {
      Reflect.deleteProperty(document, 'startViewTransition');
    }
  });

  it('binds once when initialized again after a client-side navigation', () => {
    initializeDocsSectionTabs();
    renderSidebar();

    tab('api').click();

    expect(panel('api').hidden).toBe(false);
    expect(panel('guides').hidden).toBe(true);
  });
});
