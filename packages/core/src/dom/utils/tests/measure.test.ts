import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDOMRect } from '../layout';
import { measureContentSize, restoreInlineStyle, snapshotInlineStyle } from '../measure';

describe('snapshotInlineStyle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('captures and restores selected inline style properties', () => {
    const element = document.createElement('div');
    element.style.setProperty('width', '12rem');
    element.style.setProperty('display', 'none');

    const snapshot = snapshotInlineStyle(element, ['width', 'display']);

    element.style.setProperty('width', 'max-content');
    element.style.removeProperty('display');

    restoreInlineStyle(element, snapshot);

    expect(element.style.getPropertyValue('width')).toBe('12rem');
    expect(element.style.getPropertyValue('display')).toBe('none');
  });
});

describe('measureContentSize', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns natural size from a temporary measure layout', () => {
    const element = document.createElement('div');
    element.hidden = true;

    element.getBoundingClientRect = vi.fn(() => createDOMRect(0, 0, 180, 96));

    Object.defineProperty(element, 'scrollWidth', { configurable: true, value: 180 });
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value: 96 });

    const size = measureContentSize(element, { minWidth: 160 });

    expect(size).toEqual({ width: 180, height: 96 });
    expect(element.hidden).toBe(true);
    expect(element.style.getPropertyValue('width')).toBe('');
  });

  it('sets and clears a measure attribute when requested', () => {
    const element = document.createElement('div');

    element.getBoundingClientRect = vi.fn(() => createDOMRect(0, 0, 100, 40));

    Object.defineProperty(element, 'scrollWidth', { configurable: true, value: 100 });
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value: 40 });

    measureContentSize(element, { minWidth: 80, measureAttribute: 'data-open' });

    expect(element.hasAttribute('data-open')).toBe(false);
  });

  it('keeps a measure attribute that was already present', () => {
    const element = document.createElement('div');
    element.setAttribute('data-open', '');

    element.getBoundingClientRect = vi.fn(() => createDOMRect(0, 0, 100, 40));

    Object.defineProperty(element, 'scrollWidth', { configurable: true, value: 100 });
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value: 40 });

    measureContentSize(element, { measureAttribute: 'data-open' });

    expect(element.hasAttribute('data-open')).toBe(true);
  });
});
