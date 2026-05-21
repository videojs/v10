import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Menu } from '../../menu';
import { PlaybackRateMenu, usePlaybackRateMenu } from '..';

afterEach(cleanup);

function renderPlaybackRateMenu({
  playbackRates = [0.5, 1, 1.5, 2],
  playbackRate = 1.5,
  setPlaybackRate = vi.fn(),
  formatRate,
}: {
  playbackRates?: readonly number[];
  playbackRate?: number;
  setPlaybackRate?: (rate: number) => void;
  formatRate?: (rate: number) => string;
} = {}) {
  const { Wrapper } = createPlayerWrapper({ playbackRates, playbackRate, setPlaybackRate });

  render(
    <PlaybackRateMenu.Root defaultOpen formatRate={formatRate}>
      <PlaybackRateMenu.Trigger data-testid="trigger" />
      <PlaybackRateMenu.Content data-testid="content">
        <PlaybackRateMenuItems />
      </PlaybackRateMenu.Content>
    </PlaybackRateMenu.Root>,
    { wrapper: Wrapper }
  );

  return { setPlaybackRate };
}

function PlaybackRateMenuItems(): ReactNode {
  const { options, setValue, value } = usePlaybackRateMenu();

  return (
    <Menu.RadioGroup value={value} onValueChange={setValue} label="Playback rate">
      {options.map((option) => (
        <Menu.RadioItem key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  );
}

describe('PlaybackRateMenu', () => {
  it('renders a dynamic trigger from the current playback rate', () => {
    renderPlaybackRateMenu({ playbackRate: 1.5 });

    const trigger = screen.getByTestId('trigger');

    expect(trigger.textContent).toBe('1.5×');
    expect(trigger.getAttribute('aria-label')).toBe('Playback rate 1.5');
    expect(trigger.getAttribute('data-rate')).toBe('1.5');
    expect(trigger.hasAttribute('data-inline-rate-label')).toBe(true);
  });

  it('renders the current rate inside a rendered button without children', () => {
    const { Wrapper } = createPlayerWrapper({ playbackRates: [1, 1.5], playbackRate: 1 });

    render(
      <PlaybackRateMenu.Root defaultOpen>
        <PlaybackRateMenu.Trigger render={<button type="button" data-testid="trigger" />} />
      </PlaybackRateMenu.Root>,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('trigger').textContent).toBe('1×');
  });

  it('preserves children on a rendered button', () => {
    const { Wrapper } = createPlayerWrapper({ playbackRates: [1, 1.5], playbackRate: 1 });

    render(
      <PlaybackRateMenu.Root defaultOpen>
        <PlaybackRateMenu.Trigger render={<button type="button">Text</button>} />
      </PlaybackRateMenu.Root>,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('Text').textContent).toBe('Text');
  });

  it('renders radio items from the available playback rates', () => {
    renderPlaybackRateMenu({ playbackRates: [1, 1.25, 1.5], playbackRate: 1.25 });

    expect(screen.getByRole('menuitemradio', { name: '1×' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('menuitemradio', { name: '1.25×' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('menuitemradio', { name: '1.5×' }).getAttribute('aria-checked')).toBe('false');
  });

  it('center aligns the popup by default', () => {
    renderPlaybackRateMenu();

    expect(screen.getByTestId('content').getAttribute('data-align')).toBe('center');
  });

  it('sets the selected playback rate', () => {
    const setPlaybackRate = vi.fn();
    renderPlaybackRateMenu({ setPlaybackRate });

    fireEvent.click(screen.getByRole('menuitemradio', { name: '2×' }));

    expect(setPlaybackRate).toHaveBeenCalledWith(2);
  });

  it('uses a custom rate formatter for the trigger and items', () => {
    renderPlaybackRateMenu({
      playbackRate: 1,
      formatRate: (rate) => (rate === 1 ? 'Normal' : `${rate}×`),
    });

    expect(screen.getByTestId('trigger').textContent).toBe('Normal');
    expect(screen.getByRole('menuitemradio', { name: 'Normal' }).getAttribute('aria-checked')).toBe('true');
  });

  it('disables the trigger when there are no rates', () => {
    renderPlaybackRateMenu({ playbackRates: [] });

    const trigger = screen.getByTestId('trigger');

    expect(trigger.hasAttribute('disabled')).toBe(true);
    expect(trigger.hasAttribute('data-disabled')).toBe(true);
  });
});
