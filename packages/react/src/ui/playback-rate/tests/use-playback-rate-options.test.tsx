'use client';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Menu } from '../../menu';
import { PlaybackRateButton } from '../../playback-rate-button';
import { usePlaybackRateOptions } from '../use-playback-rate-options';

afterEach(cleanup);

function renderPlaybackRateOptions({
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
    <Menu.Root defaultOpen align="center">
      <PlaybackRateTrigger formatRate={formatRate} />
      <Menu.Content data-testid="content">
        <PlaybackRateRadioGroup formatRate={formatRate} />
      </Menu.Content>
    </Menu.Root>,
    { wrapper: Wrapper }
  );

  return { setPlaybackRate };
}

function PlaybackRateRadioGroup({ formatRate }: { formatRate?: ((rate: number) => string) | undefined }): ReactNode {
  const state = usePlaybackRateOptions(formatRate ? { formatRate } : undefined);
  if (!state) return null;

  const { options, setValue, value } = state;

  return (
    <Menu.RadioGroup value={value} onValueChange={setValue} aria-label="Playback rate">
      {options.map((option) => (
        <Menu.RadioItem key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  );
}

function PlaybackRateTrigger({ formatRate }: { formatRate?: ((rate: number) => string) | undefined }): ReactNode {
  const state = usePlaybackRateOptions(formatRate ? { formatRate } : undefined);
  if (!state) return null;

  return (
    <Menu.Trigger
      disabled={state.disabled}
      render={<PlaybackRateButton data-testid="trigger" render={<button type="button" />} />}
    />
  );
}

describe('usePlaybackRateOptions', () => {
  it('renders a trigger with the current playback rate state', () => {
    renderPlaybackRateOptions({ playbackRate: 1.5 });

    const trigger = screen.getByTestId('trigger');

    expect(trigger.getAttribute('aria-label')).toBe('Playback rate 1.5');
    expect(trigger.getAttribute('data-rate')).toBe('1.5');
  });

  it('renders radio items from the available playback rates', () => {
    renderPlaybackRateOptions({ playbackRates: [1, 1.25, 1.5], playbackRate: 1.25 });

    expect(screen.getByRole('menuitemradio', { name: '1×' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('menuitemradio', { name: '1.25×' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('menuitemradio', { name: '1.5×' }).getAttribute('aria-checked')).toBe('false');
  });

  it('center aligns the popup by default', () => {
    renderPlaybackRateOptions();

    expect(screen.getByTestId('content').getAttribute('data-align')).toBe('center');
  });

  it('sets the selected playback rate', () => {
    const setPlaybackRate = vi.fn();
    renderPlaybackRateOptions({ setPlaybackRate });

    fireEvent.click(screen.getByRole('menuitemradio', { name: '2×' }));

    expect(setPlaybackRate).toHaveBeenCalledWith(2);
  });

  it('uses a custom rate formatter for items', () => {
    renderPlaybackRateOptions({
      playbackRate: 1,
      formatRate: (rate) => (rate === 1 ? 'Normal' : `${rate}×`),
    });

    expect(screen.getByRole('menuitemradio', { name: 'Normal' }).getAttribute('aria-checked')).toBe('true');
  });

  it('disables the trigger when there are no rates', () => {
    renderPlaybackRateOptions({ playbackRates: [] });

    const trigger = screen.getByTestId('trigger');

    expect(trigger.getAttribute('aria-disabled')).toBe('true');
  });
});
