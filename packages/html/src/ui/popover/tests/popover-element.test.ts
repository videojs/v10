import { afterEach, describe, expect, it, vi } from 'vitest';

import { PopoverElement } from '../popover-element';

let tagCounter = 0;

function createPopover(): PopoverElement {
  const tag = `test-popover-${tagCounter++}`;
  customElements.define(tag, class extends PopoverElement {});
  return document.createElement(tag) as PopoverElement;
}

function makeDOMRect(x: number, y: number, width: number, height: number): DOMRect {
  return new DOMRect(x, y, width, height);
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('PopoverElement', () => {
  it('exposes the positioned side on the popup', async () => {
    const trigger = document.createElement('button');
    const popover = createPopover();

    popover.id = 'popover';
    popover.open = true;
    popover.side = 'top';
    popover.boundary = 'viewport';
    trigger.setAttribute('commandfor', popover.id);

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(makeDOMRect(100, 10, 40, 20));
    vi.spyOn(popover, 'getBoundingClientRect').mockReturnValue(makeDOMRect(0, 0, 100, 60));
    vi.spyOn(document.documentElement, 'getBoundingClientRect').mockReturnValue(makeDOMRect(0, 0, 300, 200));
    Object.defineProperty(popover, 'offsetWidth', { configurable: true, value: 100 });
    Object.defineProperty(popover, 'offsetHeight', { configurable: true, value: 60 });

    document.body.append(trigger, popover);
    await popover.updateComplete;

    expect(popover.getAttribute('data-side')).toBe('bottom');
  });
});
