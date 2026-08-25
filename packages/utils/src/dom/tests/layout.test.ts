import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import {
  getBlockExtent,
  getElementPadding,
  getElementSize,
  getInlineExtent,
  measureElement,
  measureElementChildren,
} from '../layout';

afterEach(() => vi.restoreAllMocks());

function setDimensions(
  element: HTMLElement,
  dimensions: {
    rectWidth: number;
    rectHeight: number;
    offsetWidth?: number;
    offsetHeight?: number;
    scrollWidth?: number;
    scrollHeight?: number;
  }
): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    width: dimensions.rectWidth,
    height: dimensions.rectHeight,
  } as DOMRect);
  Object.defineProperties(element, {
    offsetWidth: { configurable: true, value: dimensions.offsetWidth ?? 0 },
    offsetHeight: { configurable: true, value: dimensions.offsetHeight ?? 0 },
    scrollWidth: { configurable: true, value: dimensions.scrollWidth ?? 0 },
    scrollHeight: { configurable: true, value: dimensions.scrollHeight ?? 0 },
  });
}

describe('DOM layout utilities', () => {
  it('reads bounding, layout, and overflow sizes', () => {
    const element = document.createElement('div');

    setDimensions(element, {
      rectWidth: 120,
      rectHeight: 80,
      offsetWidth: 100,
      offsetHeight: 60,
      scrollWidth: 140,
      scrollHeight: 90,
    });

    expect(getElementSize(element)).toEqual({ width: 120, height: 80 });
    expect(getElementSize(element, { box: 'layout' })).toEqual({ width: 100, height: 60 });
    expect(getElementSize(element, { box: 'layout', overflow: 'both' })).toEqual({ width: 140, height: 90 });
  });

  it('temporarily applies styles while measuring', () => {
    const element = document.createElement('div');

    element.style.setProperty('width', '80px', 'important');
    setDimensions(element, { rectWidth: 160, rectHeight: 90 });

    expect(measureElement(element, { styles: { width: 'max-content', minWidth: '0px' } })).toEqual({
      width: 160,
      height: 90,
    });
    expect(element.style.getPropertyValue('width')).toBe('80px');
    expect(element.style.getPropertyPriority('width')).toBe('important');
    expect(element.style.getPropertyValue('min-width')).toBe('');
  });

  it('reads logical padding', () => {
    const element = document.createElement('div');

    vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue({
      paddingInlineStart: '4px',
      paddingInlineEnd: '6px',
      paddingBlockStart: '8px',
      paddingBlockEnd: '10px',
    } as CSSStyleDeclaration);

    const padding = getElementPadding(element);

    expect(getInlineExtent(padding)).toBe(10);
    expect(getBlockExtent(padding)).toBe(18);
  });

  it('measures and remeasures child layouts at a maximum width', () => {
    const container = document.createElement('div');
    const first = document.createElement('div');
    const second = document.createElement('div');

    container.append(first, second);
    Object.defineProperties(first, {
      offsetLeft: { configurable: true, value: 5 },
      offsetTop: { configurable: true, value: 2 },
    });
    Object.defineProperties(second, {
      offsetLeft: { configurable: true, value: 5 },
      offsetTop: { configurable: true, value: 42 },
    });

    vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue({
      paddingLeft: '5px',
      paddingTop: '2px',
      paddingInlineStart: '5px',
      paddingInlineEnd: '5px',
      paddingBlockStart: '2px',
      paddingBlockEnd: '3px',
    } as CSSStyleDeclaration);

    const measure = vi.fn((element: HTMLElement, width?: number) => ({
      width: width ?? (element === first ? 180 : 140),
      height: width === undefined ? 40 : element === first ? 60 : 50,
    }));

    expect(
      measureElementChildren(container, {
        children: [first, second],
        includePadding: true,
        maxWidth: 150,
        measure,
      })
    ).toEqual({ width: 150, height: 95 });
    expect(measure).toHaveBeenCalledWith(first, 140);
    expect(measure).toHaveBeenCalledWith(second, 140);
  });

  it('preserves a zero maximum width', () => {
    const container = document.createElement('div');
    const child = document.createElement('div');

    container.append(child);

    expect(
      measureElementChildren(container, {
        children: [child],
        maxWidth: 0,
        measure: (_element, width) => ({ width: width ?? 100, height: 20 }),
      })
    ).toEqual({ width: 0, height: 20 });
  });
});
