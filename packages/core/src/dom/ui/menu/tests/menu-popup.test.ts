import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { MenuCSSVars } from '../../../../core/ui/menu/vars';
import { createMenuPopup } from '../menu-popup';
import { createTestMenu } from './create-menu-helpers';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('createMenuPopup', () => {
  it('includes the vertical scrollbar when sizing the popup', () => {
    const popupElement = document.createElement('div');
    const content = document.createElement('div');
    const item = document.createElement('div');
    const { menu } = createTestMenu();
    const popup = createMenuPopup();

    popupElement.style.paddingInlineStart = '4px';
    popupElement.style.paddingInlineEnd = '4px';
    popupElement.style.paddingBlockStart = '4px';
    popupElement.style.paddingBlockEnd = '4px';
    content.append(item);
    popupElement.append(content);
    document.body.append(popupElement);

    vi.spyOn(item, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 60, 266));
    Object.defineProperties(item, {
      scrollWidth: { configurable: true, value: 60 },
      scrollHeight: { configurable: true, value: 266 },
    });
    Object.defineProperties(content, {
      offsetWidth: { configurable: true, value: 64 },
      clientWidth: { configurable: true, value: 49 },
      scrollHeight: { configurable: true, value: 266 },
      clientHeight: { configurable: true, value: 209 },
    });

    popup.setElement(popupElement);
    popup.registerContent({ menu, parent: null, element: content });
    popup.sync();

    expect(popupElement.style.getPropertyValue(MenuCSSVars.width)).toBe('83px');
    expect(popupElement.style.getPropertyValue(MenuCSSVars.height)).toBe('274px');

    popup.destroy();
    menu.destroy();
  });
});
