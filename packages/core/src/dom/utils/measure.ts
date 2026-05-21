import { forceLayout } from './layout';

export interface ContentSize {
  width: number;
  height: number;
}

export interface StylePropertySnapshot {
  property: string;
  value: string;
  priority: string;
}

export type InlineStyleSnapshot = StylePropertySnapshot[];

export const DEFAULT_MEASURE_STYLE_PROPERTIES = [
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'min-width',
  'max-width',
] as const;

/** Capture selected inline style properties so a measure pass can restore them. */
export function snapshotInlineStyle(
  element: HTMLElement,
  properties: readonly string[] = DEFAULT_MEASURE_STYLE_PROPERTIES
): InlineStyleSnapshot {
  return properties.map((property) => ({
    property,
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  }));
}

/** Restore inline styles from {@link snapshotInlineStyle}. */
export function restoreInlineStyle(element: HTMLElement, snapshot: InlineStyleSnapshot): void {
  for (const { property, value, priority } of snapshot) {
    if (value) {
      element.style.setProperty(property, value, priority);
    } else {
      element.style.removeProperty(property);
    }
  }
}

export function isContentSizeValid(size: ContentSize): boolean {
  return size.width > 0 && size.height > 0;
}

export interface MeasureContentSizeOptions {
  minWidth?: number;
  /** Attribute applied during measure and removed afterward when it was absent before. */
  measureAttribute?: string;
  styleProperties?: readonly string[];
}

/**
 * Natural content size via a temporary off-layout measure pass.
 * Restores inline styles (and optional measure attribute) afterward.
 */
export function measureContentSize(element: HTMLElement, options: MeasureContentSizeOptions = {}): ContentSize {
  const { minWidth, measureAttribute, styleProperties = DEFAULT_MEASURE_STYLE_PROPERTIES } = options;
  const snapshot = snapshotInlineStyle(element, styleProperties);
  const wasHidden = element.hidden;
  const hadMeasureAttribute = measureAttribute ? element.hasAttribute(measureAttribute) : false;

  try {
    if (measureAttribute) {
      element.setAttribute(measureAttribute, '');
    }

    element.hidden = false;
    element.style.setProperty('display', 'block');
    element.style.setProperty('position', 'absolute');
    element.style.setProperty('top', '0px');
    element.style.setProperty('right', 'auto');
    element.style.setProperty('bottom', 'auto');
    element.style.setProperty('left', '0px');
    element.style.setProperty('width', 'max-content');
    element.style.setProperty('height', 'auto');

    if (minWidth !== undefined) {
      element.style.setProperty('min-width', `${minWidth}px`);
    }

    element.style.setProperty('max-width', 'none');
    forceLayout(element);

    const rect = element.getBoundingClientRect();
    const widthFloor = minWidth ?? 0;

    return {
      width: Math.ceil(Math.max(widthFloor, rect.width, element.scrollWidth)),
      height: Math.ceil(Math.max(rect.height, element.scrollHeight)),
    };
  } finally {
    element.hidden = wasHidden;

    if (measureAttribute && !hadMeasureAttribute) {
      element.removeAttribute(measureAttribute);
    }

    restoreInlineStyle(element, snapshot);
    forceLayout(element);
  }
}
