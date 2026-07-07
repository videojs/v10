'use client';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { MediaAudioTrack } from '@videojs/core';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Menu } from '../../menu';
import { useAudioTrackOptions } from '../use-audio-track-options';

afterEach(cleanup);

function renderAudioTrackOptions({
  audioTrackList = [
    { id: '0', kind: 'main', label: 'English', language: 'en', enabled: true },
    { id: '1', kind: 'alternative', label: 'Spanish', language: 'es', enabled: false },
  ],
  selectAudioTrack = vi.fn(),
  formatTrack,
}: {
  audioTrackList?: MediaAudioTrack[];
  selectAudioTrack?: (value: string) => void;
  formatTrack?: ((track: MediaAudioTrack) => string) | undefined;
} = {}) {
  const { Wrapper } = createPlayerWrapper({ audioTrackList, selectAudioTrack });

  render(
    <Menu.Root defaultOpen align="center">
      <Menu.Content data-testid="content">
        <AudioTrackRadioGroup formatTrack={formatTrack} />
      </Menu.Content>
    </Menu.Root>,
    { wrapper: Wrapper }
  );

  return { selectAudioTrack };
}

function AudioTrackRadioGroup({
  formatTrack,
}: {
  formatTrack?: ((track: MediaAudioTrack) => string) | undefined;
}): ReactNode {
  const audioTrack = useAudioTrackOptions(formatTrack ? { formatTrack } : undefined);
  if (!audioTrack) return null;

  const { options, setValue, value } = audioTrack;

  return (
    <Menu.RadioGroup value={value} onValueChange={setValue} aria-label="Audio tracks">
      {options.map((option) => (
        <Menu.RadioItem key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  );
}

describe('useAudioTrackOptions', () => {
  it('renders audio track options', () => {
    renderAudioTrackOptions();

    expect(screen.getByRole('menuitemradio', { name: 'English' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('menuitemradio', { name: 'Spanish' }).getAttribute('aria-checked')).toBe('false');
  });

  it('sets the selected audio track', () => {
    const selectAudioTrack = vi.fn();
    renderAudioTrackOptions({ selectAudioTrack });

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Spanish' }));

    expect(selectAudioTrack).toHaveBeenCalledWith('1');
  });

  it('uses a custom track formatter', () => {
    renderAudioTrackOptions({
      formatTrack: (track) => `${track.language}: ${track.label}`,
    });

    expect(screen.getByRole('menuitemradio', { name: 'en: English' })).toBeTruthy();
  });

  it('disables options when only one audio track is available', () => {
    renderAudioTrackOptions({
      audioTrackList: [{ id: '0', kind: 'main', label: 'English', language: 'en', enabled: true }],
    });

    expect(screen.getByRole('menuitemradio', { name: 'English' }).getAttribute('aria-disabled')).toBe('true');
  });
});
