import { afterEach, describe, expect, it } from 'vitest';
import { PopoverElement } from '../popover-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

function waitForMutation(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('PopoverElement', () => {
  it('binds trigger attributes when the linked trigger is available', async () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('commandfor', 'volume-popover');
    trigger.setAttribute('data-availability', 'available');

    const popover = createElement(PopoverElement);
    popover.id = 'volume-popover';

    document.body.append(trigger, popover);
    await popover.updateComplete;

    expect(popover.hidden).toBe(false);
    expect(trigger.getAttribute('aria-controls')).toBe('volume-popover');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('stays hidden and unbound when the linked trigger is unsupported', async () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('commandfor', 'volume-popover');
    trigger.setAttribute('data-availability', 'unsupported');

    const popover = createElement(PopoverElement);
    popover.id = 'volume-popover';

    document.body.append(trigger, popover);
    await popover.updateComplete;

    expect(popover.hidden).toBe(true);
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
  });

  it('rebinds when the linked trigger availability becomes available', async () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('commandfor', 'volume-popover');
    trigger.setAttribute('data-availability', 'unsupported');

    const popover = createElement(PopoverElement);
    popover.id = 'volume-popover';

    document.body.append(trigger, popover);
    await popover.updateComplete;

    expect(popover.hidden).toBe(true);

    trigger.setAttribute('data-availability', 'available');
    await waitForMutation();
    await popover.updateComplete;

    expect(popover.hidden).toBe(false);
    expect(trigger.getAttribute('aria-controls')).toBe('volume-popover');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('preserves author-supplied hidden when the trigger is available', async () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('commandfor', 'volume-popover');
    trigger.setAttribute('data-availability', 'available');

    const popover = createElement(PopoverElement);
    popover.id = 'volume-popover';
    popover.hidden = true;

    document.body.append(trigger, popover);
    await popover.updateComplete;

    expect(popover.hidden).toBe(true);
  });
});
