import { describe, expect, it } from 'vitest';

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

  it('excludes elements hidden from interaction by an ancestor', () => {
    const root = document.createElement('div');
    root.innerHTML = `
      <div inert><button type="button">Inert</button></div>
      <div hidden><button type="button">Hidden</button></div>
      <div aria-hidden="true"><button type="button">ARIA hidden</button></div>
    `;

    expect(getTabbableElements(root)).toEqual([]);
  });
});
