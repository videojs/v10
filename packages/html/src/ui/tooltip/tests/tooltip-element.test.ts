import type { ButtonState } from '@videojs/core';
import type { AnyPlayerStore, PlayerTarget } from '@videojs/core/dom';
import { HOTKEY_SHORTCUT_CHANGE_EVENT, playbackFeature } from '@videojs/core/dom';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import { ContextProvider } from '@videojs/element/context';
import { createState, createStore } from '@videojs/store';
import { afterEach, describe, expect, it } from 'vitest';

import { MediaI18nProviderElement } from '../../../i18n';
import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { PlayButtonElement } from '../../play-button/play-button-element';
import { TooltipElement } from '../tooltip-element';
import { TooltipLabelElement } from '../tooltip-label-element';
import { TooltipShortcutElement } from '../tooltip-shortcut-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

function createPlaybackStore(): AnyPlayerStore {
  const store = createStore<PlayerTarget>()(playbackFeature) as unknown as AnyPlayerStore;
  const video = document.createElement('video');
  Object.defineProperty(video, 'paused', { value: true, configurable: true });
  Object.defineProperty(video, 'ended', { value: false, configurable: true });
  Object.defineProperty(video, 'readyState', {
    value: HTMLMediaElement.HAVE_ENOUGH_DATA,
    configurable: true,
  });
  store.attach({ media: video, container: null });
  return store;
}

function defineElement(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Base);
  }
}

function ensureDefined(ctor: CustomElementConstructor & { readonly tagName: string }): void {
  defineElement(ctor.tagName, ctor);
}

class TestTriggerElement extends HTMLElement {
  $state = createState<ButtonState>({ label: 'Play' });
  shortcut: string | undefined = 'K';

  getLabel(): string | undefined {
    return this.$state.current.label;
  }

  getShortcut(): string | undefined {
    return this.shortcut;
  }
}

class TestPlayerProviderElement extends MediaElement {
  static readonly tagName = 'test-tooltip-player';

  store = createPlaybackStore();

  readonly #provider = new ContextProvider(this, { context: playerContext });

  override connectedCallback(): void {
    this.#provider.setValue(this.store);
    super.connectedCallback();
  }
}

function defineTestElements(): void {
  defineElement('test-tooltip-trigger', TestTriggerElement);
  ensureDefined(TooltipLabelElement);
  ensureDefined(TooltipShortcutElement);
}

function setup() {
  defineTestElements();

  const trigger = document.createElement('test-tooltip-trigger') as TestTriggerElement;
  const tooltip = createElement(TooltipElement);

  tooltip.id = 'tooltip';
  trigger.setAttribute('commandfor', tooltip.id);
  document.body.append(trigger, tooltip);

  return { tooltip, trigger };
}

defineElement(TestPlayerProviderElement.tagName, TestPlayerProviderElement);

afterEach(() => {
  resetI18nRegistry();
  document.body.innerHTML = '';
});

describe('TooltipElement', () => {
  it('creates default label and shortcut elements for empty tooltips', async () => {
    const { tooltip } = setup();

    await tooltip.updateComplete;

    const label = TooltipLabelElement.findIn(tooltip);
    const shortcut = TooltipShortcutElement.findIn(tooltip);
    expect(label?.localName).toBe(TooltipLabelElement.tagName);
    expect(label?.textContent).toBe('Play');
    expect(shortcut?.localName).toBe(TooltipShortcutElement.tagName);
    expect(shortcut?.textContent).toBe('K');
    expect(shortcut?.hidden).toBe(false);
  });

  it('syncs label and shortcut onto existing compound parts', async () => {
    const { tooltip } = setup();
    const labelEl = TooltipLabelElement.create();
    const shortcutEl = TooltipShortcutElement.create();
    tooltip.replaceChildren(document.createTextNode('Action: '), labelEl, shortcutEl);

    await tooltip.updateComplete;

    const label = TooltipLabelElement.findIn(tooltip);
    expect(tooltip.textContent).toBe('Action: PlayK');
    expect(label?.textContent).toBe('Play');
    expect(TooltipShortcutElement.findIn(tooltip)?.textContent).toBe('K');
  });

  it('preserves authored label content', async () => {
    const { tooltip } = setup();
    const labelEl = TooltipLabelElement.create();
    const shortcutEl = TooltipShortcutElement.create();
    labelEl.textContent = 'Custom label';
    tooltip.replaceChildren(labelEl, shortcutEl);

    await tooltip.updateComplete;

    expect(TooltipLabelElement.findIn(tooltip)?.textContent).toBe('Custom label');
    expect(TooltipShortcutElement.findIn(tooltip)?.textContent).toBe('K');
  });

  it('preserves authored content without tooltip parts', async () => {
    const { tooltip } = setup();
    tooltip.textContent = 'Custom tooltip';

    await tooltip.updateComplete;

    expect(tooltip.textContent).toBe('Custom tooltip');
  });

  it('updates shortcut text when the trigger shortcut changes', async () => {
    const { tooltip, trigger } = setup();

    await tooltip.updateComplete;

    trigger.shortcut = 'P';
    trigger.dispatchEvent(new CustomEvent(HOTKEY_SHORTCUT_CHANGE_EVENT));

    expect(TooltipShortcutElement.findIn(tooltip)?.textContent).toBe('P');
  });

  it('hides shortcut part when the trigger shortcut is cleared', async () => {
    const { tooltip, trigger } = setup();

    await tooltip.updateComplete;

    trigger.shortcut = undefined;
    trigger.dispatchEvent(new CustomEvent(HOTKEY_SHORTCUT_CHANGE_EVENT));

    const shortcut = TooltipShortcutElement.findIn(tooltip);
    expect(shortcut?.textContent).toBe('');
    expect(shortcut?.hidden).toBe(true);
  });

  it('shows translated label from the trigger control', async () => {
    registerI18n('es', { Play: 'Reproducir' });

    ensureDefined(TestPlayerProviderElement);
    ensureDefined(PlayButtonElement);
    ensureDefined(TooltipElement);
    ensureDefined(MediaI18nProviderElement);

    const player = document.createElement(TestPlayerProviderElement.tagName) as TestPlayerProviderElement;
    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'es');

    const button = document.createElement(PlayButtonElement.tagName) as PlayButtonElement;
    button.setAttribute('commandfor', 'tip');

    const tooltip = document.createElement(TooltipElement.tagName) as TooltipElement;
    tooltip.id = 'tip';
    tooltip.setAttribute('open', '');

    document.body.append(player);
    player.append(provider);
    provider.append(button, tooltip);

    await button.updateComplete;
    await tooltip.updateComplete;

    expect(TooltipLabelElement.findIn(tooltip)?.textContent).toBe('Reproducir');
  });

  it('updates tooltip text when provider locale changes', async () => {
    registerI18n('es', { Play: 'Reproducir' });
    registerI18n('fr', { Play: 'Lire' });

    ensureDefined(TestPlayerProviderElement);
    ensureDefined(PlayButtonElement);
    ensureDefined(TooltipElement);
    ensureDefined(MediaI18nProviderElement);

    const player = document.createElement(TestPlayerProviderElement.tagName) as TestPlayerProviderElement;
    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'es');

    const button = document.createElement(PlayButtonElement.tagName) as PlayButtonElement;
    button.setAttribute('commandfor', 'tip');

    const tooltip = document.createElement(TooltipElement.tagName) as TooltipElement;
    tooltip.id = 'tip';
    tooltip.setAttribute('open', '');

    document.body.append(player);
    player.append(provider);
    provider.append(button, tooltip);

    await button.updateComplete;
    await tooltip.updateComplete;
    expect(TooltipLabelElement.findIn(tooltip)?.textContent).toBe('Reproducir');

    provider.setAttribute('lang', 'fr');
    await provider.updateComplete;
    await button.updateComplete;
    await tooltip.updateComplete;

    expect(TooltipLabelElement.findIn(tooltip)?.textContent).toBe('Lire');
  });

  it('falls back to translating getLabel when getResolvedLabel is undefined', async () => {
    registerI18n('es', { Play: 'Reproducir' });

    class StubTrigger extends HTMLElement {
      static readonly tagName = 'stub-tooltip-trigger';

      readonly $state = { subscribe: () => () => {} };

      getLabel(): string {
        return 'Play';
      }

      getResolvedLabel(): undefined {
        return undefined;
      }
    }

    defineElement(StubTrigger.tagName, StubTrigger);
    ensureDefined(TooltipElement);
    ensureDefined(MediaI18nProviderElement);

    const provider = new MediaI18nProviderElement();
    provider.setAttribute('lang', 'es');

    const trigger = document.createElement(StubTrigger.tagName) as StubTrigger;
    trigger.setAttribute('commandfor', 'tip');

    const tooltip = document.createElement(TooltipElement.tagName) as TooltipElement;
    tooltip.id = 'tip';
    tooltip.setAttribute('open', '');

    document.body.append(provider);
    provider.append(trigger, tooltip);

    await tooltip.updateComplete;

    expect(tooltip.textContent).toBe('Reproducir');
  });
});
