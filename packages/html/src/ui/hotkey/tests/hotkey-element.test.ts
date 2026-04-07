import { afterEach, describe, expect, it } from 'vitest';
import { AriaKeyShortcutsController } from '../aria-key-shortcuts-controller';
import { HotkeyElement } from '../hotkey-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('HotkeyElement', () => {
  it('has the correct tag name', () => {
    expect(HotkeyElement.tagName).toBe('media-hotkey');
  });

  it('initializes with default property values', () => {
    const el = createElement(HotkeyElement);

    expect(el.keys).toBe('');
    expect(el.action).toBe('');
    expect(el.value).toBeUndefined();
    expect(el.disabled).toBe(false);
    expect(el.target).toBe('player');
  });

  it('is hidden when connected', () => {
    const el = createElement(HotkeyElement);
    document.body.appendChild(el);

    expect(el.style.display).toBe('none');
  });
});

describe('AriaKeyShortcutsController', () => {
  it('returns undefined when no coordinator exists', () => {
    const el = createElement(HotkeyElement);
    document.body.appendChild(el);

    const controller = new AriaKeyShortcutsController(el, 'togglePaused');

    expect(controller.value).toBeUndefined();
  });
});
