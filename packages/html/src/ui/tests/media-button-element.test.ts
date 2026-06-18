import { createHotkey, HOTKEY_SHORTCUT_CHANGE_EVENT } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { containerContext } from '../../player/context';
import { MediaElement } from '../media-element';
import { PlayButtonElement } from '../play-button/play-button-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

class TestContainerProviderElement extends MediaElement {
  readonly provider = new ContextProvider(this, {
    context: containerContext,
    initialValue: {
      container: this,
      setContainer: () => {},
    },
  });
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('MediaButtonElement', () => {
  it('emits shortcut changes before media is attached', async () => {
    const provider = createElement(TestContainerProviderElement);
    const button = createElement(PlayButtonElement);
    const onShortcutChange = vi.fn();

    button.addEventListener(HOTKEY_SHORTCUT_CHANGE_EVENT, onShortcutChange);
    provider.append(button);
    document.body.append(provider);

    await button.updateComplete;

    createHotkey(provider, {
      keys: 'k',
      action: 'togglePaused',
      onActivate: () => {},
    });

    await button.updateComplete;

    expect(onShortcutChange).toHaveBeenCalledTimes(1);
    expect(button.getShortcut()).toBe('K');
  });
});
