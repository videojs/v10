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
  it('assigns safe identity to an adjacent source-owned trigger', async () => {
    const firstTrigger = document.createElement('button');
    const firstPopover = createPopover();
    const secondTrigger = document.createElement('button');
    const secondPopover = createPopover();

    document.body.append(firstTrigger, firstPopover, secondTrigger, secondPopover);
    await Promise.all([firstPopover.updateComplete, secondPopover.updateComplete]);

    expect(firstPopover.id).toMatch(/^vjs-popup-/);
    expect(secondPopover.id).toMatch(/^vjs-popup-/);
    expect(firstPopover.id).not.toBe(secondPopover.id);
    expect(firstTrigger.getAttribute('commandfor')).toBe(firstPopover.id);
    expect(secondTrigger.getAttribute('commandfor')).toBe(secondPopover.id);
  });

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
