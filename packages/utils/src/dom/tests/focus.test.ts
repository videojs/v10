import { describe, expect, it } from 'vite-plus/test';

import { getDeepActiveElement, getTabbableElements } from '../focus';

describe('focus', () => {
  it('gets the active element inside open shadow roots', () => {
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const button = document.createElement('button');

    shadow.append(button);
    document.body.append(host);

    button.focus();

    expect(document.activeElement).toBe(host);
    expect(getDeepActiveElement()).toBe(button);
  });

  it('gets tabbable elements in document order', () => {
    const root = document.createElement('div');

    root.innerHTML = `
      <a href="#target">Link</a>
      <button type="button">Button</button>
      <button type="button" disabled>Disabled</button>
      <div tabindex="0">Custom control</div>
      <div tabindex="-1">Programmatic target</div>
    `;

    expect(getTabbableElements(root).map((element) => element.textContent?.trim())).toEqual([
      'Link',
      'Button',
      'Custom control',
    ]);
  });

  it('gets tabbable elements in composed tree order', () => {
    const root = document.createElement('div');
    const first = document.createElement('button');

    first.textContent = 'First';

    const host = document.createElement('div');
    const slotted = document.createElement('button');

    slotted.textContent = 'Slotted';
    host.append(slotted);

    const shadow = host.attachShadow({ mode: 'open' });
    const shadowButton = document.createElement('button');

    shadowButton.textContent = 'Shadow';
    const slot = document.createElement('slot');

    shadow.append(shadowButton, slot);

    const last = document.createElement('button');

    last.textContent = 'Last';
    root.append(first, host, last);

    expect(getTabbableElements(root).map((element) => element.textContent)).toEqual([
      'First',
      'Shadow',
      'Slotted',
      'Last',
    ]);
  });

  it('excludes elements hidden from interaction by an ancestor', () => {
    const root = document.createElement('div');

    root.innerHTML = `
      <div inert><button type="button">Inert</button></div>
      <div hidden><button type="button">Hidden</button></div>
      <div aria-hidden="true"><button type="button">ARIA hidden</button></div>
    `;

    expect(getTabbableElements(root)).toEqual([]);
  });

  it('excludes elements hidden by a shadow host', () => {
    const root = document.createElement('div');
    const host = document.createElement('div');

    host.hidden = true;
    const shadow = host.attachShadow({ mode: 'open' });
    const button = document.createElement('button');

    shadow.append(button);
    root.append(host);

    expect(getTabbableElements(root)).toEqual([]);
  });

  it('excludes elements hidden by an assigned slot', () => {
    const root = document.createElement('div');
    const host = document.createElement('div');
    const shadow = host.attachShadow({ mode: 'open' });
    const slot = document.createElement('slot');
    const button = document.createElement('button');

    slot.setAttribute('aria-hidden', 'true');
    shadow.append(slot);
    host.append(button);
    root.append(host);

    expect(getTabbableElements(root)).toEqual([]);
  });
});
