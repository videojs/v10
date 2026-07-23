import {
  getVolumeIndicatorDisplayValue,
  type VolumeIndicatorCore,
  VolumeIndicatorCSSVars,
  VolumeIndicatorDataAttrs,
} from '@videojs/core';
import { type AnyPlayerStore, getIndicatorVisibilityCoordinator } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { containerContext, playerContext } from '../../../player/context';
import { MediaElement } from '../../media-element';
import { SeekIndicatorElement } from '../../seek-indicator/seek-indicator-element';
import { SeekIndicatorValueElement } from '../../seek-indicator/seek-indicator-value-element';
import { StatusAnnouncerElement } from '../../status-announcer/status-announcer-element';
import { StatusIndicatorElement } from '../../status-indicator/status-indicator-element';
import { StatusIndicatorValueElement } from '../../status-indicator/status-indicator-value-element';
import { VolumeIndicatorElement } from '../../volume-indicator/volume-indicator-element';
import { VolumeIndicatorFillElement } from '../../volume-indicator/volume-indicator-fill-element';
import { VolumeIndicatorValueElement } from '../../volume-indicator/volume-indicator-value-element';
import { LiveIndicator } from '../live-indicator';

afterEach(() => {
  document.body.replaceChildren();
});

function defineElement(tagName: string, Base: CustomElementConstructor): void {
  if (!customElements.get(tagName)) customElements.define(tagName, Base);
}

function createTestStore(initialState: Record<string, unknown> = {}) {
  let state = initialState;
  const listeners = new Set<() => void>();
  const store = {
    get state() {
      return state;
    },
    subscribe(callback: () => void) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
  } as unknown as AnyPlayerStore;

  const setState = (partial: Record<string, unknown>) => {
    state = { ...state, ...partial };
    for (const listener of listeners) listener();
  };

  return { store, setState };
}

class TestStatusAnnouncerPlayerElement extends MediaElement {
  readonly #provider = new ContextProvider(this, { context: playerContext });
  readonly #containerProvider = new ContextProvider(this, { context: containerContext });
  #store = createTestStore().store;

  get store(): AnyPlayerStore {
    return this.#store;
  }

  set store(store: AnyPlayerStore) {
    this.#store = store;
    if (this.isConnected) this.#provider.setValue(this.#store);
  }

  override connectedCallback(): void {
    this.#provider.setValue(this.#store);
    this.#containerProvider.setValue({ container: this, setContainer: vi.fn() });
    super.connectedCallback();
  }
}

defineElement(StatusAnnouncerElement.tagName, StatusAnnouncerElement);
defineElement('test-status-announcer-player', TestStatusAnnouncerPlayerElement);

async function renderStatusAnnouncerElement(
  store: AnyPlayerStore,
  markup = '<media-status-announcer></media-status-announcer>'
) {
  const provider = document.createElement('test-status-announcer-player') as TestStatusAnnouncerPlayerElement;
  provider.store = store;
  provider.innerHTML = markup;
  document.body.append(provider);
  await provider.updateComplete;

  return {
    provider,
    announcer: provider.querySelector('media-status-announcer')!,
  };
}

describe('input indicators', () => {
  it('exposes standalone indicator tag names', () => {
    expect(StatusIndicatorElement.tagName).toBe('media-status-indicator');
    expect(StatusIndicatorValueElement.tagName).toBe('media-status-indicator-value');
    expect(StatusAnnouncerElement.tagName).toBe('media-status-announcer');
    expect(VolumeIndicatorElement.tagName).toBe('media-volume-indicator');
    expect(VolumeIndicatorFillElement.tagName).toBe('media-volume-indicator-fill');
    expect(VolumeIndicatorValueElement.tagName).toBe('media-volume-indicator-value');
    expect(SeekIndicatorElement.tagName).toBe('media-seek-indicator');
    expect(SeekIndicatorValueElement.tagName).toBe('media-seek-indicator-value');
  });

  it('uses authored HTML indicators as the mounted visual surface', () => {
    const host = document.createElement('media-volume-indicator');
    host.hidden = true;
    host.innerHTML = `
      <media-volume-indicator-fill>
        <media-volume-indicator-value></media-volume-indicator-value>
      </media-volume-indicator-fill>
    `;
    document.body.append(host);

    const indicator = new LiveIndicator<VolumeIndicatorCore.State>({
      host,
      dataAttrs: VolumeIndicatorDataAttrs,
      render: (element, state) => {
        element
          .querySelector<HTMLElement>('media-volume-indicator-fill')
          ?.style.setProperty(VolumeIndicatorCSSVars.fill, state.fill ?? '');
        const value = element.querySelector('media-volume-indicator-value');
        if (value) value.textContent = getVolumeIndicatorDisplayValue(state);
      },
    });

    const liveElement = indicator.render({
      open: true,
      generation: 1,
      level: 'high',
      value: '60%',
      fill: '60%',
      min: false,
      max: false,
      transitionStarting: true,
      transitionEnding: false,
    });

    expect(liveElement).toBe(host);
    expect(host.hidden).toBe(false);
    expect(document.body.querySelectorAll('media-volume-indicator')).toHaveLength(1);
    expect(liveElement.getAttribute('data-level')).toBe('high');
    expect(liveElement.querySelector('media-volume-indicator-value')?.textContent).toBe('60%');
    expect(
      liveElement
        .querySelector<HTMLElement>('media-volume-indicator-fill')
        ?.style.getPropertyValue(VolumeIndicatorCSSVars.fill)
    ).toBe('60%');

    indicator.remove();
    expect(host.hidden).toBe(true);
    expect(document.body.querySelectorAll('media-volume-indicator')).toHaveLength(1);
    expect(host.hasAttribute('data-open')).toBe(false);
    expect(host.hasAttribute('data-level')).toBe(false);
  });

  it('updates StatusAnnouncerElement live text from store snapshots', async () => {
    const { store, setState } = createTestStore({ paused: true });
    const { announcer } = await renderStatusAnnouncerElement(store);
    expect(announcer.textContent).toBe('');

    setState({ paused: false });
    await Promise.resolve();
    await (announcer as StatusAnnouncerElement).updateComplete;

    expect(announcer.textContent).toBe('Playing');
  });

  it('uses the next store snapshot as baseline when StatusAnnouncerElement store changes', async () => {
    const first = createTestStore({ paused: false });
    const second = createTestStore({ paused: false });
    const { announcer, provider } = await renderStatusAnnouncerElement(first.store);
    first.setState({ paused: true });
    await Promise.resolve();
    await (announcer as StatusAnnouncerElement).updateComplete;
    expect(announcer.textContent).toBe('Paused');

    provider.store = second.store;
    await Promise.resolve();
    await (announcer as StatusAnnouncerElement).updateComplete;

    expect(announcer.textContent).toBe('');
  });

  it.each([
    {
      name: 'completed seeks',
      initialState: { currentTime: 10, duration: 120, seeking: false },
      update: async (setState: (partial: Record<string, unknown>) => void) => {
        setState({ currentTime: 45, seeking: true });
        await Promise.resolve();
        setState({ seeking: false });
      },
    },
    {
      name: 'volume changes',
      initialState: { volume: 0.5, muted: false },
      update: async (setState: (partial: Record<string, unknown>) => void) => {
        setState({ volume: 0.75 });
      },
    },
  ])('does not announce $name while a slider inside the player is focused', async ({ initialState, update }) => {
    vi.useFakeTimers();

    try {
      const { store, setState } = createTestStore(initialState);
      const { announcer, provider } = await renderStatusAnnouncerElement(
        store,
        '<button role="slider"></button><media-status-announcer></media-status-announcer>'
      );

      provider.querySelector<HTMLElement>('[role="slider"]')?.focus();
      await update(setState);
      vi.advanceTimersByTime(200);
      await (announcer as StatusAnnouncerElement).updateComplete;

      expect(announcer.textContent).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('announces volume changes when a slider outside the player is focused', async () => {
    vi.useFakeTimers();
    const slider = document.createElement('button');
    slider.setAttribute('role', 'slider');
    document.body.append(slider);
    slider.focus();

    try {
      const { store, setState } = createTestStore({ volume: 0.5, muted: false });
      const { announcer } = await renderStatusAnnouncerElement(store);
      setState({ volume: 0.75 });
      await Promise.resolve();
      vi.advanceTimersByTime(200);
      await Promise.resolve();
      await (announcer as StatusAnnouncerElement).updateComplete;

      expect(announcer.textContent).toBe('Volume 75%');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shares a visibility coordinator per container', () => {
    const container = document.createElement('div');
    const first = { close: vi.fn() };
    const second = { close: vi.fn() };

    const coordinator = getIndicatorVisibilityCoordinator(container);
    coordinator.register(first);
    coordinator.register(second);
    coordinator.show(second);

    expect(getIndicatorVisibilityCoordinator(container)).toBe(coordinator);
    expect(first.close).toHaveBeenCalledOnce();
    expect(second.close).not.toHaveBeenCalled();
  });
});
