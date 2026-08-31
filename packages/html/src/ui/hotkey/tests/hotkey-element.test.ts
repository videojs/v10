import { type AnyPlayerStore, findHotkeyCoordinator } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { containerContext, playerContext } from '../../../player/context';
import { UIElement } from '../../ui-element';
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

class TestHotkeyProviderElement extends UIElement {
  readonly #store = { state: {}, subscribe: () => () => {} } as unknown as AnyPlayerStore;
  readonly containerProvider = new ContextProvider(this, {
    context: containerContext,
    initialValue: { container: this, registerContainer: () => () => {} },
  });
  readonly playerProvider = new ContextProvider(this, { context: playerContext, initialValue: this.#store });
}

if (!customElements.get('test-hotkey-provider')) {
  customElements.define('test-hotkey-provider', TestHotkeyProviderElement);
}

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

  it('registers the default ArrowDown volume step', () => {
    const provider = document.createElement('test-hotkey-provider');
    const el = createElement(HotkeyElement);

    el.keys = 'ArrowDown';
    el.action = 'volumeStep';
    provider.append(el);
    document.body.append(provider);

    const coordinator = findHotkeyCoordinator(provider)!;
    let value: number | undefined;

    coordinator.subscribe((event) => {
      value = event.value;
    });
    provider.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    expect(value).toBe(-0.05);
  });
});

describe('AriaKeyShortcutsController', () => {
  class TestContainerProviderElement extends UIElement {
    readonly provider = new ContextProvider(this, {
      context: containerContext,
      initialValue: {
        container: this,
        registerContainer: () => () => {},
      },
    });
  }

  it('returns undefined when no coordinator exists', () => {
    const el = createElement(HotkeyElement);

    document.body.appendChild(el);

    const controller = new AriaKeyShortcutsController(el, 'togglePaused');

    expect(controller.value).toBeUndefined();
  });

  it('connects when context is available during construction', () => {
    const provider = createElement(TestContainerProviderElement);
    const el = createElement(HotkeyElement);

    provider.append(el);
    document.body.append(provider);

    expect(() => new AriaKeyShortcutsController(el, 'togglePaused')).not.toThrow();
  });
});
