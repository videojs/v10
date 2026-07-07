'use client';

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Menu } from '../../menu';
import { CaptionsButton } from '../captions-button';

afterEach(cleanup);

function renderCaptionsTrigger({
  textTrackList = [
    { kind: 'subtitles', label: 'English', language: 'en', mode: 'showing' },
    { kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'disabled' },
  ] as const,
  toggleSubtitles = vi.fn(() => true),
}: {
  textTrackList?: readonly { kind: string; label: string; language: string; mode: string }[];
  toggleSubtitles?: () => boolean;
} = {}) {
  const { Wrapper } = createPlayerWrapper({
    textTrackList,
    subtitlesShowing: true,
    selectSubtitlesTrack: vi.fn(),
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    toggleSubtitles,
  });

  render(
    <Menu.Root>
      <Menu.Trigger render={<CaptionsButton data-testid="trigger" />} />
      <Menu.Content>Captions</Menu.Content>
    </Menu.Root>,
    { wrapper: Wrapper }
  );

  return { toggleSubtitles };
}

describe('CaptionsButton', () => {
  it('does not toggle captions when rendered inside Menu.Trigger with multiple tracks', () => {
    const { toggleSubtitles } = renderCaptionsTrigger();

    fireEvent.click(screen.getByTestId('trigger'));

    expect(toggleSubtitles).not.toHaveBeenCalled();
  });

  it('still toggles captions outside Menu.Trigger', () => {
    const toggleSubtitles = vi.fn(() => true);
    const { Wrapper } = createPlayerWrapper({
      textTrackList: [
        { kind: 'subtitles', label: 'English', language: 'en', mode: 'showing' },
        { kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'disabled' },
      ],
      subtitlesShowing: true,
      selectSubtitlesTrack: vi.fn(),
      chaptersCues: [],
      thumbnailCues: [],
      thumbnailTrackSrc: null,
      toggleSubtitles,
    });

    render(<CaptionsButton data-testid="trigger" />, { wrapper: Wrapper });

    fireEvent.click(screen.getByTestId('trigger'));

    expect(toggleSubtitles).toHaveBeenCalled();
  });
});
