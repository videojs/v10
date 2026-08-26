import { describe, expect, it } from 'vite-plus/test';

import { findElementChild, followElementPath, getElementChildren } from '../children';

function isHTMLElement(element: Element): element is HTMLElement {
  return element instanceof HTMLElement;
}

describe('element children', () => {
  it('filters and finds direct children with predicate inference', () => {
    const parent = document.createElement('div');
    const first = document.createElement('span');
    const second = document.createElement('button');
    const nested = document.createElement('button');

    first.append(nested);
    parent.append(first, second);

    expect(getElementChildren(parent, isHTMLElement)).toEqual([first, second]);
    expect(
      findElementChild(parent, (element): element is HTMLButtonElement => element instanceof HTMLButtonElement)
    ).toBe(second);
    expect(getElementChildren(parent, (element) => element.localName === 'button')).toEqual([second]);
  });

  it('follows a child path and stops cycles', () => {
    const root = document.createElement('div');
    const child = document.createElement('div');
    const leaf = document.createElement('div');
    const next = new Map<HTMLDivElement, HTMLDivElement>([
      [root, child],
      [child, leaf],
      [leaf, root],
    ]);

    expect(followElementPath(root, (element) => next.get(element) ?? null)).toEqual([root, child, leaf]);
  });
});
