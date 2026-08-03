import type { AnyPlayerStore } from '@videojs/core/dom';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import { ContextProvider } from '@videojs/element/context';
import type { MediaTimeState } from '@videojs/media';
import { createStore } from '@videojs/store';
import { formatTimeAsPhrase } from '@videojs/utils/time';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MediaI18nProviderElement } from '../../../i18n';
import { playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { TimeElement } from '../time-element';

let tagCounter = 0;

function uniqueTag(base: string): string {
  return `${base}-${tagCounter++}`;
}

function createElement<Element extends HTMLElement>(Base: abstract new () => Element): Element {
  const tag = uniqueTag('test-el');
  customElements.define(tag, class extends (Base as unknown as typeof HTMLElement) {});
  return document.createElement(tag) as Element;
}

function defineElement(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, Base);
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitForAssertion(assertion: () => void): Promise<void> {
  let error: unknown;

  for (let index = 0; index < 10; index++) {
    try {
      assertion();
      return;
    } catch (caught) {
      error = caught;
      await nextFrame();
    }
  }

  throw error;
}

function createTimeStore(): AnyPlayerStore {
  return createStore<unknown>()<MediaTimeState>({
    name: 'time',
    state: () => ({
      currentTime: 90,
      duration: 300,
      seeking: false,
      seek: vi.fn(),
    }),
  }) as unknown as AnyPlayerStore;
}

class TestPlayerProviderElement extends MediaElement {
  store: AnyPlayerStore = createTimeStore();

  readonly #provider = new ContextProvider(this, { context: playerContext });

  setStore(store: AnyPlayerStore): void {
    this.store = store;
    this.#provider.setValue(store);
  }

  clearStore(): void {
    this.#provider.setValue(undefined as unknown as AnyPlayerStore);
  }

  override connectedCallback(): void {
    this.#provider.setValue(this.store);
    super.connectedCallback();
  }
}

defineElement('test-time-player', TestPlayerProviderElement);
defineElement(MediaI18nProviderElement.tagName, MediaI18nProviderElement);

async function setup(props: Partial<TimeElement> = {}, locale?: string) {
  const provider = document.createElement('test-time-player') as TestPlayerProviderElement;
  const time = createElement(TimeElement);

  Object.assign(time, props);
  if (locale) {
    const i18n = new MediaI18nProviderElement();
    i18n.setAttribute('lang', locale);
    i18n.append(provider);
    document.body.append(i18n);
  } else {
    document.body.append(provider);
  }
  provider.append(time);
  await time.updateComplete;
  await waitForAssertion(() => expect(time.textContent).toBeTruthy());

  return { provider, time };
}

afterEach(() => {
  resetI18nRegistry();
  document.body.innerHTML = '';
});

describe('TimeElement', () => {
  it('reflects toggle from the attribute', async () => {
    const { time } = await setup();

    time.setAttribute('toggle', '');
    await time.updateComplete;

    expect(time.toggle).toBe(true);
  });

  it('toggles current time to remaining time on click', async () => {
    const { time } = await setup({ toggle: true });

    expect(time.getAttribute('role')).toBe('button');

    time.click();
    await time.updateComplete;

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');
    expect(time.getAttribute('aria-label')).toBe('3 minutes, 30 seconds remaining. Show elapsed time.');

    time.click();
    await time.updateComplete;

    expect(time.textContent).toBe('1:30');
    expect(time.getAttribute('data-type')).toBe('current');
    expect(time.getAttribute('aria-label')).toBe('1 minute, 30 seconds. Show remaining time.');
  });

  it('formats toggle labels with the active locale', async () => {
    registerI18n('fr', { 'time.showRemaining': '{duration}. Afficher restant.' });

    const { time } = await setup({ toggle: true }, 'fr');

    expect(time.getAttribute('aria-label')).toBe(`${formatTimeAsPhrase(90, { locale: 'fr' })}. Afficher restant.`);

    time.type = 'duration';
    await time.updateComplete;

    expect(time.getAttribute('aria-label')).toBe(`${formatTimeAsPhrase(300, { locale: 'fr' })}. Afficher restant.`);
  });

  it('formats digital time with locale digits', async () => {
    const { time } = await setup({}, 'fa');

    expect(time.textContent).toBe('۱:۳۰');
  });

  it('does not toggle before media state is available', async () => {
    const provider = document.createElement('test-time-player') as TestPlayerProviderElement;
    const time = createElement(TimeElement);

    time.toggle = true;
    document.body.append(time);
    await time.updateComplete;

    time.click();

    document.body.append(provider);
    provider.append(time);
    await time.updateComplete;
    await waitForAssertion(() => expect(time.textContent).toBeTruthy());

    expect(time.textContent).toBe('1:30');
    expect(time.getAttribute('data-type')).toBe('current');
  });

  it('toggles remaining time to duration on click', async () => {
    const { time } = await setup({ toggle: true, type: 'remaining' });

    expect(time.getAttribute('aria-label')).toBe('3 minutes, 30 seconds remaining. Show duration.');

    time.click();
    await time.updateComplete;

    expect(time.textContent).toBe('5:00');
    expect(time.getAttribute('data-type')).toBe('duration');
    expect(time.getAttribute('role')).toBe('button');
    expect(time.getAttribute('aria-label')).toBe('5 minutes. Show remaining time.');

    time.click();
    await time.updateComplete;

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');
  });

  it('toggles with Enter and Space', async () => {
    const { time } = await setup({ toggle: true });

    time.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await time.updateComplete;

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');

    time.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    await time.updateComplete;

    expect(time.textContent).toBe('1:30');
    expect(time.getAttribute('data-type')).toBe('current');
  });

  it('does not toggle on repeated keydown events', async () => {
    const { time } = await setup({ toggle: true });

    time.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await time.updateComplete;

    time.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', repeat: true, bubbles: true, cancelable: true }));
    await time.updateComplete;

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');
  });

  it('does not cancel keyboard events when toggle is turned off', async () => {
    const { time } = await setup({ toggle: true });

    time.toggle = false;
    await time.updateComplete;

    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });

    expect(time.dispatchEvent(event)).toBe(true);
    expect(event.defaultPrevented).toBe(false);
  });

  it('clears toggle attributes when media state is unavailable', async () => {
    const { provider, time } = await setup({ toggle: true });

    expect(time.getAttribute('role')).toBe('button');
    expect(time.getAttribute('tabindex')).toBe('0');
    expect(time.hasAttribute('aria-label')).toBe(true);
    expect(time.getAttribute('data-type')).toBe('current');

    provider.clearStore();
    time.requestUpdate();
    await time.updateComplete;

    expect(time.hasAttribute('role')).toBe(false);
    expect(time.hasAttribute('tabindex')).toBe(false);
    expect(time.hasAttribute('aria-label')).toBe(false);
    expect(time.hasAttribute('data-type')).toBe(false);
  });

  it('changing type resets the default display mode', async () => {
    const { time } = await setup({ toggle: true });

    time.click();
    await time.updateComplete;

    time.type = 'duration';
    await time.updateComplete;

    expect(time.textContent).toBe('5:00');
    expect(time.getAttribute('data-type')).toBe('duration');

    time.type = 'remaining';
    await time.updateComplete;

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');
  });

  it('resets to the default type when toggle is turned off', async () => {
    const { time } = await setup({ toggle: true });

    time.click();
    await time.updateComplete;

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');

    time.toggle = false;
    await time.updateComplete;

    expect(time.textContent).toBe('1:30');
    expect(time.getAttribute('data-type')).toBe('current');

    time.toggle = true;
    await time.updateComplete;

    expect(time.textContent).toBe('1:30');
    expect(time.getAttribute('data-type')).toBe('current');
  });

  it('toggles after toggle is enabled later', async () => {
    const { time } = await setup();

    time.toggle = true;
    await time.updateComplete;

    time.click();
    await time.updateComplete;

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');
  });

  it('toggles duration to remaining time on click', async () => {
    const { time } = await setup({ toggle: true, type: 'duration' });

    time.click();
    await time.updateComplete;

    expect(time.textContent).toBe('-3:30');
    expect(time.getAttribute('data-type')).toBe('remaining');

    time.click();
    await time.updateComplete;

    expect(time.textContent).toBe('5:00');
    expect(time.getAttribute('data-type')).toBe('duration');
  });
});
