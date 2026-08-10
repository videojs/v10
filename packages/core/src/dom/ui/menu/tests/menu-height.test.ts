import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncMenuHeight, syncMenuHeightChain } from '../menu-height';

afterEach(() => vi.restoreAllMocks());

function setHeight(element: HTMLElement, height: number): void {
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: height });
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ height } as DOMRect);
}

describe('syncMenuHeight', () => {
  it('measures ordinary root children by default', () => {
    const content = document.createElement('div');
    const root = document.createElement('div');
    content.append(root);
    setHeight(root, 120);

    syncMenuHeight(content);

    expect(root.hasAttribute('aria-hidden')).toBe(false);
    expect(root.hasAttribute('inert')).toBe(false);
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('120px');
  });

  it('covers ordinary root children and measures the active submenu', () => {
    const content = document.createElement('div');
    const root = document.createElement('div');
    const submenu = document.createElement('div');
    submenu.setAttribute('data-submenu', '');
    content.append(root, submenu);
    setHeight(root, 120);
    setHeight(submenu, 240);

    syncMenuHeight(content);

    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.hasAttribute('inert')).toBe(true);
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('240px');
  });

  it('restores authored accessibility state after a submenu closes', () => {
    const content = document.createElement('div');
    const root = document.createElement('div');
    const decorative = document.createElement('div');
    const submenu = document.createElement('div');
    decorative.setAttribute('aria-hidden', 'true');
    decorative.setAttribute('inert', '');
    submenu.setAttribute('data-submenu', '');
    content.append(root, decorative, submenu);
    setHeight(root, 120);
    setHeight(decorative, 0);
    setHeight(submenu, 240);

    syncMenuHeight(content);
    submenu.hidden = true;
    syncMenuHeight(content);

    expect(root.hasAttribute('aria-hidden')).toBe(false);
    expect(root.hasAttribute('inert')).toBe(false);
    expect(decorative.getAttribute('aria-hidden')).toBe('true');
    expect(decorative.hasAttribute('inert')).toBe(true);
  });

  it('measures root content while a submenu is ending but keeps it covered', () => {
    const content = document.createElement('div');
    const root = document.createElement('div');
    const submenu = document.createElement('div');
    submenu.setAttribute('data-submenu', '');
    submenu.setAttribute('data-ending-style', '');
    content.append(root, submenu);
    setHeight(root, 120);
    setHeight(submenu, 240);

    syncMenuHeight(content);

    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.hasAttribute('inert')).toBe(true);
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('120px');
  });

  it('propagates the deepest active submenu height through nested menus', () => {
    const root = document.createElement('div');
    const rootItems = document.createElement('div');
    const first = document.createElement('div');
    const firstItems = document.createElement('div');
    const second = document.createElement('div');
    const secondItems = document.createElement('div');

    root.setAttribute('role', 'menu');
    first.setAttribute('role', 'menu');
    first.setAttribute('data-submenu', '');
    second.setAttribute('role', 'menu');
    second.setAttribute('data-submenu', '');
    root.append(rootItems, first);
    first.append(firstItems, second);
    second.append(secondItems);
    setHeight(rootItems, 120);
    setHeight(firstItems, 180);
    setHeight(secondItems, 240);

    syncMenuHeightChain(first);

    expect(root.style.getPropertyValue('--media-menu-height')).toBe('240px');
    expect(first.style.getPropertyValue('--media-menu-height')).toBe('240px');
    expect(rootItems.hasAttribute('inert')).toBe(true);
    expect(firstItems.hasAttribute('inert')).toBe(true);

    second.setAttribute('data-ending-style', '');
    syncMenuHeightChain(first);

    expect(root.style.getPropertyValue('--media-menu-height')).toBe('180px');
    expect(first.style.getPropertyValue('--media-menu-height')).toBe('180px');
    expect(rootItems.hasAttribute('inert')).toBe(true);
    expect(firstItems.hasAttribute('inert')).toBe(true);
  });
});
