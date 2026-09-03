import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { MenuCSSVars } from '../../../../core/ui/menu/vars';
import { createMenuPopup } from '../menu-popup';
import { createTestMenu } from './create-menu-helpers';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('createMenuPopup', () => {
  it('keeps repeated measurements stable when a panel is pinned to both block edges', () => {
    const popup = createMenuPopup();
    const { menu } = createTestMenu();
    const element = document.createElement('div');
    const content = document.createElement('div');
    const panel = document.createElement('div');
    const naturalHeight = 180;

    element.style.paddingBlockStart = '6px';
    element.style.paddingBlockEnd = '6px';
    panel.style.position = 'absolute';
    panel.style.inset = '0px';
    content.append(panel);
    element.append(content);
    document.body.append(element);

    // A panel authored with `inset: 0` stretches to the Popup height written by the previous
    // measurement unless its block-end inset is released while measuring.
    const getMeasuredHeight = () => {
      if (panel.style.insetBlockEnd === 'auto') return naturalHeight;

      const popupHeight = Number.parseFloat(element.style.getPropertyValue(MenuCSSVars.height)) || 0;

      return Math.max(naturalHeight, popupHeight);
    };

    Object.defineProperty(panel, 'scrollWidth', { configurable: true, value: 180 });
    Object.defineProperty(panel, 'scrollHeight', { configurable: true, get: getMeasuredHeight });
    // SAFETY: `getElementSize` reads only `width` and `height` from the rect.
    vi.spyOn(panel, 'getBoundingClientRect').mockImplementation(
      () => ({ width: 180, height: getMeasuredHeight() }) as DOMRect
    );

    popup.setElement(element);
    const cleanup = popup.registerContent({ menu, parent: null, element: content });

    popup.sync();
    expect(element.style.getPropertyValue(MenuCSSVars.height)).toBe('192px');

    popup.sync();
    expect(element.style.getPropertyValue(MenuCSSVars.height)).toBe('192px');
    expect(panel.style.inset).toBe('0px');
    expect(panel.style.insetBlockEnd).toBe('');

    cleanup();
    popup.destroy();
    menu.destroy();
  });
});
