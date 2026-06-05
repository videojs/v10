import {
  getVolumeIndicatorDisplayValue,
  type VolumeIndicatorCore,
  VolumeIndicatorCSSVars,
  VolumeIndicatorDataAttrs,
} from '@videojs/core';
import { type AnyPlayerStore, getIndicatorVisibilityCoordinator } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { playerContext } from '../../../player/context';
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
  store = createTestStore().store;

  readonly #provider = new ContextProvider(this, { context: playerContext });

  override connectedCallback(): void {
    this.#provider.setValue(this.store);
    super.connectedCallback();
  }
}

defineElement(StatusAnnouncerElement.tagName, StatusAnnouncerElement);
defineElement('test-status-announcer-player', TestStatusAnnouncerPlayerElement);

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
    const provider = document.createElement('test-status-announcer-player') as TestStatusAnnouncerPlayerElement;
    provider.store = store;
    provider.innerHTML = '<media-status-announcer></media-status-announcer>';
    document.body.append(provider);
    await provider.updateComplete;

    const announcer = provider.querySelector('media-status-announcer')!;
    expect(announcer.textContent).toBe('');

    setState({ paused: false });
    await Promise.resolve();
    await (announcer as StatusAnnouncerElement).updateComplete;

    expect(announcer.textContent).toBe('Playing');
  });

  it('does not announce completed seeks while a time slider is focused', async () => {
    vi.useFakeTimers();
    const slider = document.createElement('button');
    slider.setAttribute('role', 'slider');
    document.body.append(slider);
    slider.focus();

    try {
      const { store, setState } = createTestStore({ currentTime: 10, duration: 120, seeking: false });
      const provider = document.createElement('test-status-announcer-player') as TestStatusAnnouncerPlayerElement;
      provider.store = store;
      provider.innerHTML = '<media-status-announcer></media-status-announcer>';
      document.body.append(provider);
      await provider.updateComplete;

      const announcer = provider.querySelector('media-status-announcer')!;
      setState({ currentTime: 45, seeking: true });
      await Promise.resolve();
      setState({ seeking: false });
      await Promise.resolve();
      vi.advanceTimersByTime(200);
      await (announcer as StatusAnnouncerElement).updateComplete;

      expect(announcer.textContent).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not announce volume changes while a volume slider is focused', async () => {
    vi.useFakeTimers();
    const slider = document.createElement('button');
    slider.setAttribute('role', 'slider');
    document.body.append(slider);
    slider.focus();

    try {
      const { store, setState } = createTestStore({ volume: 0.5, muted: false });
      const provider = document.createElement('test-status-announcer-player') as TestStatusAnnouncerPlayerElement;
      provider.store = store;
      provider.innerHTML = '<media-status-announcer></media-status-announcer>';
      document.body.append(provider);
      await provider.updateComplete;

      const announcer = provider.querySelector('media-status-announcer')!;
      setState({ volume: 0.75 });
      await Promise.resolve();
      vi.advanceTimersByTime(200);
      await (announcer as StatusAnnouncerElement).updateComplete;

      expect(announcer.textContent).toBe('');
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
