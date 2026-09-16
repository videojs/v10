import { describe, expect, it } from 'vite-plus/test';

import {
  findComposedElement,
  findElementChild,
  followElementPath,
  getComposedChildren,
  getElementChildren,
} from '../children';

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

  it('returns assigned elements for a filled slot and fallback content otherwise', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const slot = document.createElement('slot');
    const fallback = document.createElement('img');
    const supplied = document.createElement('img');

    slot.append(fallback);
    shadow.append(slot);
    document.body.append(host);

    expect(getComposedChildren(slot)).toEqual([fallback]);

    host.append(supplied);

    expect(getComposedChildren(slot)).toEqual([supplied]);
    expect(getComposedChildren(host)).toEqual([supplied]);

    host.remove();
  });

  it('finds a composed descendant through wrappers and forwarding slots', () => {
    const outer = document.createElement('div');
    const outerShadow = outer.attachShadow({ mode: 'open' });
    const inner = document.createElement('div');
    const forwardingSlot = document.createElement('slot');
    const picture = document.createElement('picture');
    const image = document.createElement('img');

    // <outer><img></outer> -> outer shadow: <inner><slot></slot></inner>, so the image reaches `inner` via the slot.
    picture.append(image);
    outer.append(picture);
    inner.append(forwardingSlot);
    outerShadow.append(inner);
    document.body.append(outer);

    const isImage = (element: Element): element is HTMLImageElement => element instanceof HTMLImageElement;

    expect(findComposedElement(inner, isImage)).toBe(image);
    expect(findComposedElement(outer, isImage)).toBe(image);
    expect(findComposedElement(inner, (element) => element.localName === 'video')).toBeNull();
    expect(findComposedElement(image, isImage)).toBeNull();

    outer.remove();
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
