import {
  type AttributeSnapshot,
  findElementChild,
  followElementPath,
  getElementChildren,
  measureElement,
  measureElementChildren,
  observeElements,
  readCSSLength,
  restoreAttributes,
  snapshotAttributes,
  walkAncestors,
} from '@videojs/utils/dom';
import { MenuCSSVars } from '../../../core/ui/menu/menu-css-vars';

const MENU_SUBMENU_ATTR = 'data-submenu';
const MENU_SUBMENU_EXPANDED_ATTR = 'data-submenu-expanded';

interface MenuSize {
  width: number;
  height: number;
}

const coveredStates = new WeakMap<HTMLElement, AttributeSnapshot>();
const rootSizes = new WeakMap<HTMLElement, MenuSize>();

function getActiveSubmenu(content: HTMLElement): HTMLElement | null {
  return findElementChild(
    content,
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.hasAttribute(MENU_SUBMENU_ATTR) && !child.hidden
  );
}

function getRootChildren(content: HTMLElement): HTMLElement[] {
  return getElementChildren(
    content,
    (child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute(MENU_SUBMENU_ATTR)
  );
}

function setCovered(element: HTMLElement, covered: boolean): void {
  const previous = coveredStates.get(element);

  if (covered) {
    if (!previous) {
      coveredStates.set(element, snapshotAttributes(element, ['aria-hidden', 'inert']));
    }

    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('inert', '');
    return;
  }

  if (!previous) return;

  restoreAttributes(element, previous);
  coveredStates.delete(element);
}

function measureMenuElement(element: HTMLElement, width?: number): MenuSize {
  return measureElement(element, {
    overflow: 'both',
    styles: {
      insetInlineStart: '0px',
      insetInlineEnd: 'auto',
      width: width === undefined ? 'max-content' : `${width}px`,
      height: 'auto',
      minWidth: '0px',
      maxWidth: 'none',
    },
  });
}

function getAvailableWidth(content: HTMLElement): number | null {
  return (
    walkAncestors(content, (element) => {
      const width = readCSSLength(element, MenuCSSVars.availableWidth);
      return width !== null && width > 0 ? width : undefined;
    }) ?? null
  );
}

function constrainWidth(content: HTMLElement, width: number): number {
  const availableWidth = getAvailableWidth(content);
  return availableWidth === null ? width : Math.min(width, Math.max(0, availableWidth));
}

function getRootSize(content: HTMLElement, children: HTMLElement[]): MenuSize {
  return measureElementChildren(content, {
    children,
    includePadding: true,
    maxWidth: getAvailableWidth(content),
    measure: measureMenuElement,
  });
}

function getConstrainedElementSize(content: HTMLElement, element: HTMLElement): MenuSize {
  const naturalSize = measureMenuElement(element);
  const width = constrainWidth(content, naturalSize.width);

  if (width >= naturalSize.width) return naturalSize;

  const constrainedSize = measureMenuElement(element, width);

  return { width, height: constrainedSize.height };
}

function getCurrentSize(content: HTMLElement): MenuSize {
  const path = followElementPath(content, (current) => {
    const activeSubmenu = getActiveSubmenu(current);
    return activeSubmenu?.hasAttribute('data-ending-style') ? null : activeSubmenu;
  });
  const current = path[path.length - 1]!;
  const activeSubmenu = getActiveSubmenu(current);
  const rootChildren = getRootChildren(current);
  const measuredRootSize = getRootSize(current, rootChildren);
  const ownRootSize =
    current.hasAttribute(MENU_SUBMENU_ATTR) && rootChildren.length === 0
      ? getConstrainedElementSize(current, current)
      : measuredRootSize;

  if (!activeSubmenu?.hasAttribute('data-ending-style')) {
    rootSizes.set(current, ownRootSize);
    return ownRootSize;
  }

  return rootSizes.get(current) ?? ownRootSize;
}

/** Synchronize menu size and accessibility to the active submenu, if any. */
export function syncMenuSize(content: HTMLElement | null): void {
  if (!content) return;

  const activeSubmenu = getActiveSubmenu(content);
  const rootChildren = getRootChildren(content);
  const covered = activeSubmenu !== null;

  if (activeSubmenu) {
    content.setAttribute(
      MENU_SUBMENU_EXPANDED_ATTR,
      activeSubmenu.hasAttribute('data-ending-style') ? 'false' : 'true'
    );
  } else {
    content.removeAttribute(MENU_SUBMENU_EXPANDED_ATTR);
  }

  for (const child of rootChildren) setCovered(child, covered);

  const size = getCurrentSize(content);
  content.style.setProperty(MenuCSSVars.width, `${Math.ceil(size.width)}px`);
  content.style.setProperty(MenuCSSVars.height, `${Math.ceil(size.height)}px`);
}

/** Synchronize a menu and each direct menu-content ancestor. */
export function syncMenuSizeChain(content: HTMLElement | null): void {
  let current = content;

  while (current) {
    syncMenuSize(current);
    const parent = current.parentElement;
    current = parent?.getAttribute('role') === 'menu' ? parent : null;
  }
}

/** Re-measure when the active submenu or ordinary root content changes size. */
export function observeMenuSize(content: HTMLElement, onResize: () => void): () => void {
  return observeElements({
    root: content,
    getElements: () => {
      const activeSubmenu = getActiveSubmenu(content);

      return activeSubmenu && !activeSubmenu.hasAttribute('data-ending-style')
        ? [activeSubmenu]
        : getRootChildren(content);
    },
    mutations: { childList: true },
    onChange: onResize,
  });
}
