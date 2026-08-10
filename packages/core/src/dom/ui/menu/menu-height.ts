import { MenuCSSVars } from '../../../core/ui/menu/menu-css-vars';

const MENU_SUBMENU_ATTR = 'data-submenu';

interface CoveredState {
  ariaHidden: string | null;
  inert: boolean;
}

const coveredStates = new WeakMap<HTMLElement, CoveredState>();
const rootHeights = new WeakMap<HTMLElement, number>();

function getActiveSubmenu(content: HTMLElement): HTMLElement | null {
  return (
    Array.from(content.children).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.hasAttribute(MENU_SUBMENU_ATTR) && !child.hidden
    ) ?? null
  );
}

function getRootChildren(content: HTMLElement): HTMLElement[] {
  return Array.from(content.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && !child.hasAttribute(MENU_SUBMENU_ATTR)
  );
}

function setCovered(element: HTMLElement, covered: boolean): void {
  const previous = coveredStates.get(element);

  if (covered) {
    if (!previous) {
      coveredStates.set(element, {
        ariaHidden: element.getAttribute('aria-hidden'),
        inert: element.hasAttribute('inert'),
      });
    }

    element.setAttribute('aria-hidden', 'true');
    element.setAttribute('inert', '');
    return;
  }

  if (!previous) return;

  if (previous.ariaHidden === null) {
    element.removeAttribute('aria-hidden');
  } else {
    element.setAttribute('aria-hidden', previous.ariaHidden);
  }
  element.toggleAttribute('inert', previous.inert);
  coveredStates.delete(element);
}

function getElementHeight(element: HTMLElement): number {
  return Math.max(element.getBoundingClientRect().height, element.scrollHeight);
}

function getRootHeight(content: HTMLElement, children: HTMLElement[]): number {
  const measuredChildren = children.filter((child) => !child.hidden);
  const padding = getComputedStyle(content);
  const paddingBlock =
    (Number.parseFloat(padding.paddingBlockStart) || 0) + (Number.parseFloat(padding.paddingBlockEnd) || 0);

  if (measuredChildren.length === 0) return paddingBlock;

  const measurements = measuredChildren.map((child) => ({
    height: getElementHeight(child),
    top: child.offsetTop,
  }));
  const hasPositionedChildren = measurements.some(({ top }) => top !== measurements[0]!.top);
  const childrenHeight = hasPositionedChildren
    ? Math.max(...measurements.map(({ height, top }) => top + height))
    : measurements.reduce((total, { height }) => total + height, 0);

  return childrenHeight + paddingBlock;
}

function getCurrentHeight(content: HTMLElement): number {
  const activeSubmenu = getActiveSubmenu(content);
  const rootChildren = getRootChildren(content);
  const measuredRootHeight = getRootHeight(content, rootChildren);
  const ownRootHeight =
    content.hasAttribute(MENU_SUBMENU_ATTR) && rootChildren.length === 0
      ? Math.max(measuredRootHeight, getElementHeight(content))
      : measuredRootHeight;

  if (!activeSubmenu) {
    rootHeights.set(content, ownRootHeight);
    return ownRootHeight;
  }

  if (activeSubmenu.hasAttribute('data-ending-style')) {
    return rootHeights.get(content) ?? ownRootHeight;
  }

  return getCurrentHeight(activeSubmenu);
}

/** Synchronize menu height and accessibility to the active submenu, if any. */
export function syncMenuHeight(content: HTMLElement | null): void {
  if (!content) return;

  const activeSubmenu = getActiveSubmenu(content);
  const rootChildren = getRootChildren(content);
  const covered = activeSubmenu !== null;

  for (const child of rootChildren) setCovered(child, covered);

  content.style.setProperty(MenuCSSVars.height, `${Math.ceil(getCurrentHeight(content))}px`);
}

/** Synchronize a menu and each direct menu-content ancestor. */
export function syncMenuHeightChain(content: HTMLElement | null): void {
  let current = content;

  while (current) {
    syncMenuHeight(current);
    const parent = current.parentElement;
    current = parent?.getAttribute('role') === 'menu' ? parent : null;
  }
}

/** Re-measure when the active submenu or ordinary root content changes size. */
export function observeMenuHeight(content: HTMLElement, onResize: () => void): () => void {
  if (typeof ResizeObserver === 'undefined') return () => {};

  const resizeObserver = new ResizeObserver(onResize);

  const observeCurrentElements = () => {
    resizeObserver.disconnect();
    const activeSubmenu = getActiveSubmenu(content);
    const elements =
      activeSubmenu && !activeSubmenu.hasAttribute('data-ending-style') ? [activeSubmenu] : getRootChildren(content);

    for (const element of elements) resizeObserver.observe(element);
  };

  observeCurrentElements();

  const mutationObserver = new MutationObserver(() => {
    observeCurrentElements();
    onResize();
  });
  mutationObserver.observe(content, { childList: true });

  return () => {
    mutationObserver.disconnect();
    resizeObserver.disconnect();
  };
}
