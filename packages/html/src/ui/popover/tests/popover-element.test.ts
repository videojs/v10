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

  it('binds trigger attributes when the popover id contains special characters', async () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('commandfor', 'volume:popover special');
    trigger.setAttribute('data-availability', 'available');

    const popover = createElement(PopoverElement);
    popover.id = 'volume:popover special';

    document.body.append(trigger, popover);
    await popover.updateComplete;

    expect(popover.hidden).toBe(false);
    expect(trigger.getAttribute('aria-controls')).toBe('volume:popover special');
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

  it('rebinds when a linked trigger is added inside a wrapper subtree', async () => {
    const popover = createElement(PopoverElement);
    popover.id = 'volume-popover';

    document.body.append(popover);
    await popover.updateComplete;

    const wrapper = document.createElement('div');
    const trigger = document.createElement('button');
    trigger.setAttribute('commandfor', 'volume-popover');
    trigger.setAttribute('data-availability', 'available');
    wrapper.append(trigger);
    document.body.append(wrapper);

    await waitForMutation();
    await popover.updateComplete;

    expect(popover.hidden).toBe(false);
    expect(trigger.getAttribute('aria-controls')).toBe('volume-popover');
  });

  it('rebinds when an existing element commandfor changes to the popover id', async () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('commandfor', 'other-popover');
    trigger.setAttribute('data-availability', 'available');

    const popover = createElement(PopoverElement);
    popover.id = 'volume-popover';

    document.body.append(trigger, popover);
    await popover.updateComplete;

    expect(popover.hidden).toBe(true);

    trigger.setAttribute('commandfor', 'volume-popover');
    await waitForMutation();
    await popover.updateComplete;

    expect(popover.hidden).toBe(false);
    expect(trigger.getAttribute('aria-controls')).toBe('volume-popover');
  });

  it('cleans up when a linked trigger is removed inside a wrapper subtree', async () => {
    const wrapper = document.createElement('div');
    const trigger = document.createElement('button');
    trigger.setAttribute('commandfor', 'volume-popover');
    trigger.setAttribute('data-availability', 'available');
    wrapper.append(trigger);

    const popover = createElement(PopoverElement);
    popover.id = 'volume-popover';

    document.body.append(wrapper, popover);
    await popover.updateComplete;

    wrapper.remove();

    await waitForMutation();
    await popover.updateComplete;

    expect(popover.hidden).toBe(true);
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
  });

  it('cleans up trigger attributes when the popover disconnects', async () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('commandfor', 'volume-popover');
    trigger.setAttribute('data-availability', 'available');

    const popover = createElement(PopoverElement);
    popover.id = 'volume-popover';

    document.body.append(trigger, popover);
    await popover.updateComplete;

    popover.remove();

    expect(trigger.hasAttribute('aria-controls')).toBe(false);
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
    expect(trigger.style.getPropertyValue('anchor-name')).toBe('');
  });
});
