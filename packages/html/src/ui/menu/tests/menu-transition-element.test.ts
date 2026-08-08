import { afterEach, describe, expect, it, vi } from 'vitest';
import { MenuElement } from '../menu-element';
import { MenuItemElement } from '../menu-item-element';
import { MenuTransitionRootElement } from '../menu-transition-root-element';
import { MenuTransitionViewElement } from '../menu-transition-view-element';

function defineElement(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) customElements.define(tagName, Base);
}

defineElement(MenuElement.tagName, MenuElement);
defineElement(MenuItemElement.tagName, MenuItemElement);
defineElement(MenuTransitionRootElement.tagName, MenuTransitionRootElement);
defineElement(MenuTransitionViewElement.tagName, MenuTransitionViewElement);

async function frame(): Promise<void> {
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

async function settle(...elements: HTMLElement[]): Promise<void> {
  await Promise.all(
    elements.map((element) =>
      'updateComplete' in element ? (element as MenuElement).updateComplete : Promise.resolve()
    )
  );
  await Promise.resolve();
  await frame();
  await Promise.all(
    elements.map((element) =>
      'updateComplete' in element ? (element as MenuElement).updateComplete : Promise.resolve()
    )
  );
}

function setup() {
  const transition = document.createElement(MenuTransitionRootElement.tagName) as MenuTransitionRootElement;
  transition.rootViewClass = 'root-panel';
  const root = document.createElement(MenuElement.tagName) as MenuElement;
  const trigger = document.createElement(MenuItemElement.tagName) as MenuItemElement;
  const view = document.createElement(MenuTransitionViewElement.tagName) as MenuTransitionViewElement;
  const child = document.createElement(MenuElement.tagName) as MenuElement;
  const back = document.createElement(MenuItemElement.tagName) as MenuItemElement;
  const option = document.createElement(MenuItemElement.tagName) as MenuItemElement;

  root.open = true;
  child.id = 'quality-menu';
  trigger.setAttribute('commandfor', child.id);
  trigger.textContent = 'Quality';
  back.textContent = 'Back';
  option.textContent = 'Auto';
  child.append(back, option);
  view.append(child);
  root.append(trigger, view);
  transition.append(root);
  document.body.append(transition);

  return { transition, root, trigger, view, child, back, option };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('MenuTransitionRootElement', () => {
  it('wraps one root menu and generates its root panel', async () => {
    const fixture = setup();
    await settle(...Object.values(fixture));
    const panels = fixture.root.querySelectorAll<HTMLElement>('[data-menu-root-view]');

    expect(panels).toHaveLength(1);
    expect(panels[0]?.classList.contains('root-panel')).toBe(true);
    expect(panels[0]?.getAttribute('data-view-state')).toBe('active');
    expect(panels[0]?.contains(fixture.trigger)).toBe(true);
    expect(fixture.child.hidden).toBe(true);
    expect(fixture.child.hasAttribute('data-submenu')).toBe(true);
    expect(fixture.trigger.hasAttribute('data-has-submenu')).toBe(true);
    expect(fixture.child.getAttribute('aria-hidden')).toBe('true');
  });

  it('opens a committed child from commandfor and keeps outgoing DOM live', async () => {
    const fixture = setup();
    await settle(...Object.values(fixture));
    const rootPanel = fixture.root.querySelector<HTMLElement>('[data-menu-root-view]')!;

    fixture.trigger.click();
    await settle(fixture.root, fixture.child, fixture.transition);

    expect(fixture.child.open).toBe(true);
    expect(fixture.child.getAttribute('data-view-state')).toBe('active');
    expect(fixture.child.getAttribute('data-direction')).toBe('forward');
    expect(rootPanel.hidden).toBe(false);
    expect(rootPanel.getAttribute('data-view-state')).toBe('inactive');
    expect(rootPanel.inert).toBe(true);
  });

  it('uses an ordinary child item to navigate back', async () => {
    const fixture = setup();
    await settle(...Object.values(fixture));
    fixture.trigger.click();
    await settle(fixture.child, fixture.transition);

    fixture.back.click();
    await settle(fixture.root, fixture.child, fixture.transition);

    expect(fixture.child.open).toBe(false);
    expect(fixture.child.getAttribute('data-view-state')).toBe('inactive');
    expect(fixture.root.querySelector('[data-menu-root-view]')?.getAttribute('data-view-state')).toBe('active');
  });

  it('supports ArrowRight and ArrowLeft in the optional binding', async () => {
    const fixture = setup();
    await settle(...Object.values(fixture));

    fixture.trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    await settle(fixture.child, fixture.transition);
    expect(fixture.child.open).toBe(true);

    fixture.child.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await settle(fixture.child, fixture.transition);
    expect(fixture.child.open).toBe(false);
  });

  it('does not transition when a child open request is canceled', async () => {
    const fixture = setup();
    fixture.child.addEventListener('open-change', (event) => event.preventDefault());
    await settle(...Object.values(fixture));
    const rootPanel = fixture.root.querySelector<HTMLElement>('[data-menu-root-view]')!;

    fixture.trigger.click();
    await settle(fixture.child, fixture.transition);

    expect(fixture.child.open).toBe(false);
    expect(fixture.child.getAttribute('data-view-state')).toBe('inactive');
    expect(rootPanel.getAttribute('data-view-state')).toBe('active');
  });

  it('restores authored children when disconnected and can reconnect cleanly', async () => {
    const fixture = setup();
    await settle(...Object.values(fixture));

    fixture.transition.remove();

    expect(fixture.root.querySelector('[data-menu-root-view]')).toBeNull();
    expect(fixture.trigger.parentElement).toBe(fixture.root);

    document.body.append(fixture.transition);
    await settle(...Object.values(fixture));

    const panels = fixture.root.querySelectorAll('[data-menu-root-view]');
    expect(panels).toHaveLength(1);
    expect(panels[0]?.contains(fixture.trigger)).toBe(true);
  });

  it('resolves nested command targets inside a shadow root', async () => {
    const fixture = setup();
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    fixture.transition.remove();
    shadow.append(fixture.transition);
    document.body.append(host);
    await settle(...Object.values(fixture));

    fixture.trigger.click();
    await settle(fixture.root, fixture.child, fixture.transition);

    expect(fixture.child.open).toBe(true);
    expect(fixture.child.getAttribute('data-view-state')).toBe('active');
  });
});
