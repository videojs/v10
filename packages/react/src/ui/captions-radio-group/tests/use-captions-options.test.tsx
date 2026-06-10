'use client';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CAPTIONS_OFF_VALUE } from '@videojs/core';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Menu } from '../../menu';
import { useCaptionsOptions } from '../use-captions-options';

afterEach(cleanup);

function renderCaptionsMenu({
  textTrackList = [
    { kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' },
    { kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'showing' },
  ] as const,
  subtitlesShowing = true,
  selectSubtitlesTrack = vi.fn(),
}: {
  textTrackList?: readonly { kind: string; label: string; language: string; mode: string }[];
  subtitlesShowing?: boolean;
  selectSubtitlesTrack?: (value: string) => void;
} = {}) {
  const { Wrapper } = createPlayerWrapper({
    textTrackList,
    subtitlesShowing,
    selectSubtitlesTrack,
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    toggleSubtitles: vi.fn(),
  });

  render(
    <Menu.Root defaultOpen align="center">
      <Menu.Content data-testid="content">
        <CaptionsRadioGroup />
      </Menu.Content>
    </Menu.Root>,
    { wrapper: Wrapper }
  );

  return { selectSubtitlesTrack };
}

function CaptionsRadioGroup(): ReactNode {
  const captions = useCaptionsOptions();
  if (!captions?.showMenu) return null;

  const { options, setValue, value } = captions;

  return (
    <Menu.RadioGroup value={value} onValueChange={setValue} aria-label="Captions">
      {options.map((option) => (
        <Menu.RadioItem key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  );
}

describe('useCaptionsOptions', () => {
  it('renders radio items for off and available tracks', () => {
    renderCaptionsMenu();

    expect(screen.getByRole('menuitemradio', { name: 'Off' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('menuitemradio', { name: 'English' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('menuitemradio', { name: 'Spanish' }).getAttribute('aria-checked')).toBe('true');
  });

  it('center aligns the popup by default', () => {
    renderCaptionsMenu();

    expect(screen.getByTestId('content').getAttribute('data-align')).toBe('center');
  });

  it('selects a captions track', () => {
    const selectSubtitlesTrack = vi.fn();
    renderCaptionsMenu({ selectSubtitlesTrack });

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));

    expect(selectSubtitlesTrack).toHaveBeenCalledWith('0');
  });

  it('turns captions off', () => {
    const selectSubtitlesTrack = vi.fn();
    renderCaptionsMenu({ selectSubtitlesTrack });

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Off' }));

    expect(selectSubtitlesTrack).toHaveBeenCalledWith(CAPTIONS_OFF_VALUE);
  });
});
