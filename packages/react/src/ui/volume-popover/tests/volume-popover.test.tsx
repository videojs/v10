import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { VolumePopover } from '..';
import { createPlayerWrapper } from '../../../testing/mocks';
import { MuteButton } from '../../mute-button/mute-button';

const availableVolume = {
  volume: 1,
  muted: false,
  volumeAvailability: 'available',
  mutedAvailability: 'available',
  setVolume: () => 1,
  toggleMuted: () => false,
};

function makeDOMRect(x: number, y: number, width: number, height: number): DOMRect {
  return new DOMRect(x, y, width, height);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('VolumePopover', () => {
  it('opens its popup when volume level controls are available', async () => {
    const { Wrapper } = createPlayerWrapper(availableVolume);

    render(
      <Wrapper>
        <VolumePopover.Root>
          <VolumePopover.Trigger
            render={
              <button type="button" data-testid="trigger">
                Volume
              </button>
            }
          />
          <VolumePopover.Popup data-testid="popup">Slider</VolumePopover.Popup>
        </VolumePopover.Root>
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('trigger'));

    await waitFor(() => {
      expect(screen.getByTestId('popup').getAttribute('data-availability')).toBe('available');
      expect(screen.getByTestId('trigger').getAttribute('aria-expanded')).toBe('true');
    });
  });

  it.each(['unavailable', 'unsupported'] as const)(
    'keeps only its trigger when volume level controls are %s',
    (volumeAvailability) => {
      const { Wrapper } = createPlayerWrapper({ ...availableVolume, volumeAvailability });

      render(
        <Wrapper>
          <VolumePopover.Root defaultOpen>
            <VolumePopover.Trigger data-testid="trigger" render={<MuteButton>Mute</MuteButton>} />
            <VolumePopover.Popup data-testid="popup">Slider</VolumePopover.Popup>
          </VolumePopover.Root>
        </Wrapper>
      );

      expect(screen.getByTestId('trigger').hasAttribute('aria-expanded')).toBe(false);
      expect(screen.queryByTestId('popup')).toBeNull();
    }
  );

  it('closes an open popup when volume level controls become unavailable', async () => {
    const { Wrapper, store } = createPlayerWrapper(availableVolume);

    render(
      <Wrapper>
        <VolumePopover.Root>
          <VolumePopover.Trigger
            render={
              <button type="button" data-testid="trigger">
                Volume
              </button>
            }
          />
          <VolumePopover.Popup data-testid="popup">Slider</VolumePopover.Popup>
        </VolumePopover.Root>
      </Wrapper>
    );

    fireEvent.click(screen.getByTestId('trigger'));
    await waitFor(() => expect(screen.queryByTestId('popup')).not.toBeNull());

    act(() => {
      store.state = { ...availableVolume, volumeAvailability: 'unsupported' };
      const subscriptions = store.subscribe.mock.calls as unknown as Array<[() => void]>;

      for (const [notify] of subscriptions) notify();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('popup')).toBeNull();
      expect(screen.getByTestId('trigger').hasAttribute('aria-expanded')).toBe(false);
    });
  });

  it('preserves the collision-adjusted side', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.dataset.testid === 'trigger') return makeDOMRect(100, 10, 40, 20);

      if (this.dataset.testid === 'popup') return makeDOMRect(0, 0, 100, 60);

      return makeDOMRect(0, 0, 300, 200);
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'popup' ? 100 : 0;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'popup' ? 60 : 0;
    });

    const { Wrapper } = createPlayerWrapper(availableVolume);

    render(
      <Wrapper>
        <VolumePopover.Root defaultOpen side="top" boundary="viewport">
          <VolumePopover.Trigger data-testid="trigger">Volume</VolumePopover.Trigger>
          <VolumePopover.Popup data-testid="popup">Slider</VolumePopover.Popup>
        </VolumePopover.Root>
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('popup').getAttribute('data-side')).toBe('bottom');
    });
  });
});
