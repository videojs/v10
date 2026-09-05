import type { AnyPlayerStore } from '@videojs/core/dom';
import { ContextProvider } from '@videojs/element/context';
import type { MediaVolumeState } from '@videojs/media';
import { createStore } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { playerContext } from '../../../player/context';
import { UIElement } from '../../ui-element';
import { VolumePopoverElement } from '../volume-popover-element';

let tagCounter = 0;

function createVolumeStore(volumeAvailability: MediaVolumeState['volumeAvailability']): AnyPlayerStore {
  return createStore<unknown>()<MediaVolumeState>({
    name: 'volume',
    state: () => ({
      volume: 1,
      muted: false,
      volumeAvailability,
      mutedAvailability: 'available',
      setVolume: vi.fn(),
      toggleMuted: vi.fn(),
    }),
  }) as unknown as AnyPlayerStore;
}

class TestPlayerProviderElement extends UIElement {
  store: AnyPlayerStore = createVolumeStore('available');
  readonly #provider = new ContextProvider(this, { context: playerContext });

  override connectedCallback(): void {
    this.#provider.setValue(this.store);
    super.connectedCallback();
  }
}

if (!customElements.get('test-volume-popover-player')) {
  customElements.define('test-volume-popover-player', TestPlayerProviderElement);
}

function createPopover(): VolumePopoverElement {
  const tag = `test-volume-popover-${tagCounter++}`;

  customElements.define(tag, class extends VolumePopoverElement {});
  return document.createElement(tag) as VolumePopoverElement;
}

function createPlayerProvider(): TestPlayerProviderElement {
  // SAFETY: The tag is registered to TestPlayerProviderElement above.
  return document.createElement('test-volume-popover-player') as TestPlayerProviderElement;
}

function makeDOMRect(x: number, y: number, width: number, height: number): DOMRect {
  return new DOMRect(x, y, width, height);
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('VolumePopoverElement', () => {
  it('has the correct tag name', () => {
    expect(VolumePopoverElement.tagName).toBe('media-volume-popover');
  });

  it.each([
    ['available', false],
    ['unavailable', true],
    ['unsupported', true],
  ] as const)('reflects %s volume controls with hidden=%s', async (volumeAvailability, hidden) => {
    const provider = createPlayerProvider();

    provider.store = createVolumeStore(volumeAvailability);
    const trigger = document.createElement('button');
    const popover = createPopover();

    document.body.append(provider);
    provider.append(trigger, popover);
    await popover.updateComplete;

    expect(popover.hidden).toBe(hidden);
    expect(popover.hasAttribute('data-hidden')).toBe(hidden);
    expect(popover.getAttribute('data-availability')).toBe(volumeAvailability);
    expect(trigger.getAttribute('commandfor')).toBe(popover.id);
    expect(trigger.hasAttribute('aria-expanded')).toBe(!hidden);
    expect(trigger.hasAttribute('aria-haspopup')).toBe(!hidden);
    expect(trigger.hasAttribute('aria-controls')).toBe(!hidden);
  });

  it('does not attach popover interactions when volume controls are unavailable', async () => {
    const provider = createPlayerProvider();

    provider.store = createVolumeStore('unsupported');
    const trigger = document.createElement('button');
    const popover = createPopover();
    const onOpenChange = vi.fn();

    popover.addEventListener('open-change', onOpenChange);
    document.body.append(provider);
    provider.append(trigger, popover);
    await popover.updateComplete;

    trigger.click();
    await popover.updateComplete;

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(popover.hasAttribute('data-open')).toBe(false);
    expect(trigger.hasAttribute('aria-expanded')).toBe(false);
    expect(trigger.hasAttribute('aria-haspopup')).toBe(false);
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
  });

  it('preserves the collision-adjusted side', async () => {
    const provider = createPlayerProvider();
    const trigger = document.createElement('button');
    const popover = createPopover();

    popover.id = 'volume-popover';
    popover.open = true;
    popover.side = 'top';
    popover.boundary = 'viewport';
    trigger.setAttribute('commandfor', popover.id);

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(makeDOMRect(100, 10, 40, 20));
    vi.spyOn(popover, 'getBoundingClientRect').mockReturnValue(makeDOMRect(0, 0, 100, 60));
    vi.spyOn(document.documentElement, 'getBoundingClientRect').mockReturnValue(makeDOMRect(0, 0, 300, 200));
    Object.defineProperty(popover, 'offsetWidth', { configurable: true, value: 100 });
    Object.defineProperty(popover, 'offsetHeight', { configurable: true, value: 60 });

    document.body.append(provider);
    provider.append(trigger, popover);
    await popover.updateComplete;

    expect(popover.getAttribute('data-side')).toBe('bottom');
  });
});
