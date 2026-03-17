import { describe, expect, it, vi } from 'vitest';

import { resolveCSSLength } from '../style';

describe('resolveCSSLength', () => {
  it('Returns px values directly', () => {
    const el = document.createElement('div');

    expect(resolveCSSLength(el, '8px')).toBe(8);
  });

  it('Resolves rem values using the root font size', () => {
    const el = document.createElement('div');
    const getComputedStyleSpy = vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(
      (target: Element) =>
        ({
          fontSize: target === document.documentElement ? '16px' : '14px',
        }) as CSSStyleDeclaration
    );

    expect(resolveCSSLength(el, '0.5rem')).toBe(8);

    getComputedStyleSpy.mockRestore();
  });

  it('Resolves em values using the element font size', () => {
    const el = document.createElement('div');
    const getComputedStyleSpy = vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(
      () =>
        ({
          fontSize: '14px',
        }) as CSSStyleDeclaration
    );

    expect(resolveCSSLength(el, '1em')).toBe(14);

    getComputedStyleSpy.mockRestore();
  });

  it('Falls back to measurement for other CSS lengths', () => {
    const el = document.createElement('div');
    const createElement = document.createElement.bind(document);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const node = createElement(tagName);

      if (tagName === 'div') {
        vi.spyOn(node, 'getBoundingClientRect').mockImplementation(() => {
          const width = node.style.inlineSize === '10vw' ? 24 : 0;
          return {
            x: 0,
            y: 0,
            width,
            height: 0,
            top: 0,
            left: 0,
            right: width,
            bottom: 0,
            toJSON() {},
          };
        });
      }

      return node;
    });

    expect(resolveCSSLength(el, '10vw')).toBe(24);
    expect(appendChildSpy).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
  });

  it('Preserves measured zero pixel values', () => {
    const el = document.createElement('div');
    const createElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const node = createElement(tagName);

      if (tagName === 'div') {
        vi.spyOn(node, 'getBoundingClientRect').mockImplementation(() => ({
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          toJSON() {},
        }));
      }

      return node;
    });

    expect(resolveCSSLength(el, 'calc(1px - 1px)')).toBe(0);

    createElementSpy.mockRestore();
  });
});
