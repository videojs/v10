import { resolveCSSLength } from '@videojs/utils/dom';
import { MenuCSSVars } from '../../../core/ui/menu/menu-css-vars';

const MENU_SUBMENU_ATTR = 'data-submenu';

interface CoveredState {
  ariaHidden: string | null;
  inert: boolean;
}

interface MenuSize {
  width: number;
  height: number;
}

interface StyleSnapshotEntry {
  property: string;
  value: string;
  priority: string;
}

const measureStyleProperties = ['inset-inline-start', 'inset-inline-end', 'width', 'height', 'min-width', 'max-width'];
const coveredStates = new WeakMap<HTMLElement, CoveredState>();
const rootSizes = new WeakMap<HTMLElement, MenuSize>();

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

function snapshotInlineStyle(element: HTMLElement): StyleSnapshotEntry[] {
  return measureStyleProperties.map((property) => ({
    property,
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  }));
}

function restoreInlineStyle(element: HTMLElement, snapshot: StyleSnapshotEntry[]): void {
  for (const { property, value, priority } of snapshot) {
    if (value) {
      element.style.setProperty(property, value, priority);
    } else {
      element.style.removeProperty(property);
    }
  }
}

function measureElement(element: HTMLElement, width?: number): MenuSize {
  const snapshot = snapshotInlineStyle(element);

  try {
    element.style.setProperty('inset-inline-start', '0px');
    element.style.setProperty('inset-inline-end', 'auto');
    element.style.setProperty('width', width === undefined ? 'max-content' : `${width}px`);
    element.style.setProperty('height', 'auto');
    element.style.setProperty('min-width', '0px');
    element.style.setProperty('max-width', 'none');

    const rect = element.getBoundingClientRect();

    return {
      width: Math.max(rect.width, element.scrollWidth),
      height: Math.max(rect.height, element.scrollHeight),
    };
  } finally {
    restoreInlineStyle(element, snapshot);
  }
}

function getPadding(content: HTMLElement): { inline: number; block: number } {
  const style = getComputedStyle(content);

  return {
    inline: (Number.parseFloat(style.paddingInlineStart) || 0) + (Number.parseFloat(style.paddingInlineEnd) || 0),
    block: (Number.parseFloat(style.paddingBlockStart) || 0) + (Number.parseFloat(style.paddingBlockEnd) || 0),
  };
}

function getAvailableWidth(content: HTMLElement): number | null {
  let current: HTMLElement | null = content;

  while (current) {
    const value =
      current.style.getPropertyValue(MenuCSSVars.availableWidth) ||
      getComputedStyle(current).getPropertyValue(MenuCSSVars.availableWidth);
    const width = resolveCSSLength(current, value);

    if (Number.isFinite(width) && width > 0) return width;
    current = current.parentElement;
  }

  return null;
}

function constrainWidth(content: HTMLElement, width: number): number {
  const availableWidth = getAvailableWidth(content);
  return availableWidth ? Math.min(width, availableWidth) : width;
}

function getRootSize(content: HTMLElement, children: HTMLElement[]): MenuSize {
  const measuredChildren = children.filter((child) => !child.hidden);
  const padding = getPadding(content);

  if (measuredChildren.length === 0) return { width: padding.inline, height: padding.block };

  let measurements = measuredChildren.map((child) => ({
    ...measureElement(child),
    top: child.offsetTop,
  }));
  const naturalWidth = Math.max(...measurements.map(({ width }) => width)) + padding.inline;
  const width = constrainWidth(content, naturalWidth);

  if (width < naturalWidth) {
    const childWidth = Math.max(0, width - padding.inline);
    measurements = measuredChildren.map((child) => ({
      ...measureElement(child, childWidth),
      top: child.offsetTop,
    }));
  }

  const hasPositionedChildren = measurements.some(({ top }) => top !== measurements[0]!.top);
  const childrenHeight = hasPositionedChildren
    ? Math.max(...measurements.map(({ height, top }) => top + height))
    : measurements.reduce((total, { height }) => total + height, 0);

  return { width, height: childrenHeight + padding.block };
}

function getElementSize(content: HTMLElement, element: HTMLElement): MenuSize {
  const naturalSize = measureElement(element);
  const width = constrainWidth(content, naturalSize.width);

  if (width >= naturalSize.width) return naturalSize;

  const constrainedSize = measureElement(element, width);

  return { width, height: constrainedSize.height };
}

function getCurrentSize(content: HTMLElement): MenuSize {
  const activeSubmenu = getActiveSubmenu(content);
  const rootChildren = getRootChildren(content);
  const measuredRootSize = getRootSize(content, rootChildren);
  const ownRootSize =
    content.hasAttribute(MENU_SUBMENU_ATTR) && rootChildren.length === 0
      ? getElementSize(content, content)
      : measuredRootSize;

  if (!activeSubmenu) {
    rootSizes.set(content, ownRootSize);
    return ownRootSize;
  }

  if (activeSubmenu.hasAttribute('data-ending-style')) {
    return rootSizes.get(content) ?? ownRootSize;
  }

  return getCurrentSize(activeSubmenu);
}

/** Synchronize menu size and accessibility to the active submenu, if any. */
export function syncMenuSize(content: HTMLElement | null): void {
  if (!content) return;

  const activeSubmenu = getActiveSubmenu(content);
  const rootChildren = getRootChildren(content);
  const covered = activeSubmenu !== null;

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
