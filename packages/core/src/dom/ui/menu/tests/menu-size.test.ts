import { afterEach, describe, expect, it, vi } from 'vitest';
import { syncMenuSize, syncMenuSizeChain } from '../menu-size';

afterEach(() => vi.restoreAllMocks());

function setSize(element: HTMLElement, width: number, height: number): void {
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: width });
  Object.defineProperty(element, 'scrollHeight', { configurable: true, value: height });
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({ width, height } as DOMRect);
}

describe('syncMenuSize', () => {
  it('measures ordinary root children by default', () => {
    const content = document.createElement('div');
    const root = document.createElement('div');
    content.append(root);
    setSize(root, 180, 120);

    syncMenuSize(content);

    expect(root.hasAttribute('aria-hidden')).toBe(false);
    expect(root.hasAttribute('inert')).toBe(false);
    expect(content.hasAttribute('data-submenu-expanded')).toBe(false);
    expect(content.style.getPropertyValue('--media-menu-width')).toBe('180px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('120px');
  });

  it('covers ordinary root children and measures the active submenu', () => {
    const content = document.createElement('div');
    const root = document.createElement('div');
    const submenu = document.createElement('div');
    submenu.setAttribute('data-submenu', '');
    content.append(root, submenu);
    setSize(root, 180, 120);
    setSize(submenu, 220, 240);

    syncMenuSize(content);

    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.hasAttribute('inert')).toBe(true);
    expect(content.getAttribute('data-submenu-expanded')).toBe('true');
    expect(content.style.getPropertyValue('--media-menu-width')).toBe('220px');
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
    setSize(root, 180, 120);
    setSize(decorative, 0, 0);
    setSize(submenu, 220, 240);

    syncMenuSize(content);
    submenu.hidden = true;
    syncMenuSize(content);

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
    setSize(root, 180, 120);
    setSize(submenu, 220, 240);

    syncMenuSize(content);

    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.hasAttribute('inert')).toBe(true);
    expect(content.getAttribute('data-submenu-expanded')).toBe('false');
    expect(content.style.getPropertyValue('--media-menu-width')).toBe('180px');
    expect(content.style.getPropertyValue('--media-menu-height')).toBe('120px');
  });

  it('constrains the active panel to the available width', () => {
    const content = document.createElement('div');
    const root = document.createElement('div');
    const submenu = document.createElement('div');
    submenu.setAttribute('data-submenu', '');
    content.style.setProperty('--media-menu-available-width', '200px');
    content.append(root, submenu);
    setSize(root, 180, 120);
    setSize(submenu, 280, 240);

    syncMenuSize(content);

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('200px');
  });

  it('ignores a non-positive available width before positioning', () => {
    const content = document.createElement('div');
    const root = document.createElement('div');
    content.style.setProperty('--media-menu-available-width', '0px');
    content.append(root);
    setSize(root, 180, 120);

    syncMenuSize(content);

    expect(content.style.getPropertyValue('--media-menu-width')).toBe('180px');
  });

  it('propagates the deepest active submenu size through nested menus', () => {
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
    setSize(rootItems, 180, 120);
    setSize(firstItems, 200, 180);
    setSize(secondItems, 220, 240);

    syncMenuSizeChain(first);

    expect(root.style.getPropertyValue('--media-menu-width')).toBe('220px');
    expect(first.style.getPropertyValue('--media-menu-width')).toBe('220px');
    expect(root.style.getPropertyValue('--media-menu-height')).toBe('240px');
    expect(first.style.getPropertyValue('--media-menu-height')).toBe('240px');
    expect(rootItems.hasAttribute('inert')).toBe(true);
    expect(firstItems.hasAttribute('inert')).toBe(true);
    expect(root.getAttribute('data-submenu-expanded')).toBe('true');
    expect(first.getAttribute('data-submenu-expanded')).toBe('true');

    second.setAttribute('data-ending-style', '');
    syncMenuSizeChain(first);

    expect(root.style.getPropertyValue('--media-menu-width')).toBe('200px');
    expect(first.style.getPropertyValue('--media-menu-width')).toBe('200px');
    expect(root.style.getPropertyValue('--media-menu-height')).toBe('180px');
    expect(first.style.getPropertyValue('--media-menu-height')).toBe('180px');
    expect(rootItems.hasAttribute('inert')).toBe(true);
    expect(firstItems.hasAttribute('inert')).toBe(true);
    expect(root.getAttribute('data-submenu-expanded')).toBe('true');
    expect(first.getAttribute('data-submenu-expanded')).toBe('false');
  });
});
