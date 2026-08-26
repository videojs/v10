import {
  type AttributeSnapshot,
  getBlockExtent,
  getElementChildren,
  getElementPadding,
  getInlineExtent,
  measureElement,
  measureElementChildren,
  observeElements,
  readCSSLength,
  restoreAttributes,
  snapshotAttributes,
  walkAncestors,
} from '@videojs/utils/dom';

import { MenuContentDataAttrs } from '../../../core/ui/menu/data';
import { MenuCSSVars } from '../../../core/ui/menu/vars';
import type { MenuApi } from './create-menu';

export interface MenuContentRegistration {
  menu: MenuApi;
  parent: MenuApi | null;
  element: HTMLElement;
}

export interface MenuPopupApi {
  readonly element: HTMLElement | null;
  setElement: (element: HTMLElement | null) => void;
  registerContent: (registration: MenuContentRegistration) => () => void;
  sync: () => void;
  destroy: () => void;
}

interface RegisteredContent extends MenuContentRegistration {
  accessibility: AttributeSnapshot;
  stopObserving: () => void;
  unsubscribe: () => void;
}

/** Coordinates sibling Contents and sizes their shared Popup. */
export function createMenuPopup(): MenuPopupApi {
  const contents = new Set<RegisteredContent>();
  let element: HTMLElement | null = null;
  let frame = 0;

  function scheduleSync(): void {
    cancelAnimationFrame(frame);
    sync();
    frame = requestAnimationFrame(sync);
  }

  function getChildren(parent: MenuApi): RegisteredContent[] {
    return [...contents].filter((content) => content.parent === parent);
  }

  function getActiveChild(parent: MenuApi): RegisteredContent | null {
    return (
      getChildren(parent).find(({ menu }) => {
        const input = menu.input.current;

        return input.active && input.status !== 'ending';
      }) ?? null
    );
  }

  function getCurrentContent(): RegisteredContent | null {
    let current = [...contents].find((content) => content.parent === null) ?? null;

    while (current) {
      const child = getActiveChild(current.menu);
      if (!child) return current;

      current = child;
    }

    return null;
  }

  function setInactive(content: RegisteredContent, inactive: boolean): void {
    if (inactive) {
      content.element.setAttribute('aria-hidden', 'true');
      content.element.setAttribute('inert', '');
    } else {
      restoreAttributes(content.element, content.accessibility);
    }
  }

  function getAvailableWidth(popup: HTMLElement): number | null {
    return (
      walkAncestors(popup, (ancestor) => {
        const width = readCSSLength(ancestor, MenuCSSVars.availableWidth);

        return width !== null && width > 0 ? width : undefined;
      }) ?? null
    );
  }

  function measureContent(content: HTMLElement, availableWidth: number | null) {
    const children = getElementChildren(
      content,
      (child): child is HTMLElement => child instanceof HTMLElement && !child.hidden
    );

    if (children.length === 0) {
      return measureElement(content, {
        overflow: 'both',
        styles: { width: 'max-content', height: 'auto', minWidth: '0px', maxWidth: 'none' },
      });
    }

    return measureElementChildren(content, {
      children,
      includePadding: true,
      maxWidth: availableWidth,
      measure: (child, width) =>
        measureElement(child, {
          overflow: 'both',
          styles: {
            insetInlineStart: '0px',
            insetInlineEnd: 'auto',
            width: width === undefined ? 'max-content' : `${width}px`,
            height: 'auto',
            minWidth: '0px',
            maxWidth: 'none',
          },
        }),
    });
  }

  function sync(): void {
    if (!element) return;

    for (const content of contents) {
      const activeChild = getActiveChild(content.menu);

      if (activeChild) {
        content.menu.highlight(null);
        content.element.setAttribute(MenuContentDataAttrs.childOpen, '');
      } else {
        content.element.removeAttribute(MenuContentDataAttrs.childOpen);
      }

      const input = content.menu.input.current;
      const isExitingPage = content.parent !== null && input.active && input.status === 'ending';

      setInactive(content, activeChild !== null || isExitingPage);
    }

    const current = getCurrentContent();
    if (!current) return;

    // Root Content sits inside Popup padding. Positioned nested Contents own their padding.
    const popupPadding = current.parent === null ? getElementPadding(element) : null;
    const inlinePadding = popupPadding ? getInlineExtent(popupPadding) : 0;
    const blockPadding = popupPadding ? getBlockExtent(popupPadding) : 0;
    const availableWidth = getAvailableWidth(element);
    const contentAvailableWidth = availableWidth === null ? null : Math.max(0, availableWidth - inlinePadding);
    const size = measureContent(current.element, contentAvailableWidth);

    element.style.setProperty(MenuCSSVars.width, `${Math.ceil(size.width + inlinePadding)}px`);
    element.style.setProperty(MenuCSSVars.height, `${Math.ceil(size.height + blockPadding)}px`);
  }

  function setElement(next: HTMLElement | null): void {
    element = next;
    scheduleSync();
  }

  function registerContent(registration: MenuContentRegistration): () => void {
    const registered: RegisteredContent = {
      ...registration,
      accessibility: snapshotAttributes(registration.element, ['aria-hidden', 'inert']),
      stopObserving: () => {},
      unsubscribe: () => {},
    };

    registered.unsubscribe = registration.menu.input.subscribe(scheduleSync);
    registered.stopObserving = observeElements({
      root: registration.element,
      getElements: () => [registration.element],
      mutations: { childList: true, subtree: true, characterData: true },
      onChange: scheduleSync,
    });
    contents.add(registered);
    registration.menu.setContentElement(registration.element);
    scheduleSync();

    return () => {
      contents.delete(registered);
      registered.unsubscribe();
      registered.stopObserving();
      restoreAttributes(registration.element, registered.accessibility);
      registration.element.removeAttribute(MenuContentDataAttrs.childOpen);

      if (registration.menu.contentElement === registration.element) registration.menu.setContentElement(null);

      scheduleSync();
    };
  }

  function destroy(): void {
    cancelAnimationFrame(frame);

    for (const content of contents) {
      content.unsubscribe();
      content.stopObserving();
      restoreAttributes(content.element, content.accessibility);
      content.element.removeAttribute(MenuContentDataAttrs.childOpen);

      if (content.menu.contentElement === content.element) content.menu.setContentElement(null);
    }

    contents.clear();
    element = null;
  }

  return {
    get element(): HTMLElement | null {
      return element;
    },
    setElement,
    registerContent,
    sync,
    destroy,
  };
}
