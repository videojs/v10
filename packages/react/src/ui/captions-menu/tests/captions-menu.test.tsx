import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { CaptionsMenuTrack, MediaTextTrackState } from '@videojs/core';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../../testing/mocks';
import { Menu } from '../../menu';
import { CaptionsMenu, useCaptionsMenu } from '..';

afterEach(cleanup);

function createTextTrackState({
  textTrackList = [
    { kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' },
    { kind: 'captions', label: 'CC', language: 'en', mode: 'showing' },
  ],
  subtitlesShowing = true,
  selectTextTrack = vi.fn(),
}: {
  textTrackList?: MediaTextTrackState['textTrackList'] | undefined;
  subtitlesShowing?: boolean | undefined;
  selectTextTrack?: ((trackIndex: number | null) => boolean) | undefined;
} = {}): MediaTextTrackState {
  return {
    chaptersCues: [],
    thumbnailCues: [],
    thumbnailTrackSrc: null,
    textTrackList,
    subtitlesShowing,
    toggleSubtitles: vi.fn(() => true),
    selectTextTrack,
  };
}

function renderCaptionsMenu({
  textTrackList,
  subtitlesShowing,
  selectTextTrack = vi.fn(),
  formatTrack,
}: {
  textTrackList?: MediaTextTrackState['textTrackList'] | undefined;
  subtitlesShowing?: boolean | undefined;
  selectTextTrack?: ((trackIndex: number | null) => boolean) | undefined;
  formatTrack?: ((track: CaptionsMenuTrack) => string) | undefined;
} = {}) {
  const { Wrapper } = createPlayerWrapper(
    createTextTrackState({ textTrackList, subtitlesShowing, selectTextTrack }) as unknown as Record<string, unknown>
  );

  render(
    <CaptionsMenu.Root defaultOpen formatTrack={formatTrack}>
      <CaptionsMenu.Trigger data-testid="trigger" />
      <CaptionsMenu.Content data-testid="content">
        <CaptionsMenuItems />
      </CaptionsMenu.Content>
    </CaptionsMenu.Root>,
    { wrapper: Wrapper }
  );

  return { selectTextTrack };
}

function CaptionsMenuItems(): ReactNode {
  const { menuSectionLabel, options, setValue, value } = useCaptionsMenu();

  return (
    <Menu.RadioGroup value={value} onValueChange={setValue} label={menuSectionLabel}>
      {options.map((option) => (
        <Menu.RadioItem key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </Menu.RadioItem>
      ))}
    </Menu.RadioGroup>
  );
}

describe('CaptionsMenu', () => {
  it('renders a dynamic trigger from the selected text track', () => {
    renderCaptionsMenu();

    const trigger = screen.getByTestId('trigger');

    expect(trigger.textContent).toBe('Captions, CC');
    expect(trigger.getAttribute('aria-label')).toBe('Captions, CC');
    expect(trigger.getAttribute('data-active')).toBe('');
    expect(trigger.getAttribute('data-availability')).toBe('available');
  });

  it('preserves children on a rendered button', () => {
    const { Wrapper } = createPlayerWrapper(createTextTrackState() as unknown as Record<string, unknown>);

    render(
      <CaptionsMenu.Root defaultOpen>
        <CaptionsMenu.Trigger render={<button type="button">Text</button>} />
      </CaptionsMenu.Root>,
      { wrapper: Wrapper }
    );

    expect(screen.getByText('Text').textContent).toBe('Text');
  });

  it('renders off and text track radio items', () => {
    renderCaptionsMenu();

    expect(screen.getByRole('menuitemradio', { name: 'Off' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('menuitemradio', { name: 'English' }).getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('menuitemradio', { name: 'CC' }).getAttribute('aria-checked')).toBe('true');
  });

  it('center aligns the popup by default', () => {
    renderCaptionsMenu();

    expect(screen.getByTestId('content').getAttribute('data-align')).toBe('center');
  });

  it('sets the selected text track', () => {
    const selectTextTrack = vi.fn(() => true);
    renderCaptionsMenu({ selectTextTrack });

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));

    expect(selectTextTrack).toHaveBeenCalledWith(0);
  });

  it('turns captions off', () => {
    const selectTextTrack = vi.fn(() => true);
    renderCaptionsMenu({ selectTextTrack });

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Off' }));

    expect(selectTextTrack).toHaveBeenCalledWith(null);
  });

  it('uses a custom track formatter for the trigger and items', () => {
    renderCaptionsMenu({
      formatTrack: (track) => `${track.language.toUpperCase()} ${track.kind}`,
    });

    expect(screen.getByTestId('trigger').textContent).toBe('Captions, EN captions');
    expect(screen.getByRole('menuitemradio', { name: 'EN captions' }).getAttribute('aria-checked')).toBe('true');
  });

  it('renders SectionLabel with default menu section copy', () => {
    const { Wrapper } = createPlayerWrapper(createTextTrackState() as unknown as Record<string, unknown>);

    render(
      <CaptionsMenu.Root defaultOpen>
        <CaptionsMenu.Content>
          <CaptionsMenu.SectionLabel data-testid="section-label" />
        </CaptionsMenu.Content>
      </CaptionsMenu.Root>,
      { wrapper: Wrapper }
    );

    const section = screen.getByTestId('section-label');
    expect(section.textContent).toBe('Captions');
    expect(section.getAttribute('data-part')).toBe('section-label');
  });

  it('renders SectionLabel from menuSectionLabel on Root', () => {
    const { Wrapper } = createPlayerWrapper(createTextTrackState() as unknown as Record<string, unknown>);

    render(
      <CaptionsMenu.Root defaultOpen menuSectionLabel="Subtitles">
        <CaptionsMenu.Content>
          <CaptionsMenu.SectionLabel data-testid="section-label" />
        </CaptionsMenu.Content>
      </CaptionsMenu.Root>,
      { wrapper: Wrapper }
    );

    expect(screen.getByTestId('section-label').textContent).toBe('Subtitles');
  });

  it('disables the trigger when no captions are available', () => {
    renderCaptionsMenu({
      textTrackList: [{ kind: 'metadata', label: 'thumbnails', language: '', mode: 'hidden' }],
      subtitlesShowing: false,
    });

    const trigger = screen.getByTestId('trigger');

    expect(trigger.hasAttribute('disabled')).toBe(true);
    expect(trigger.hasAttribute('data-disabled')).toBe(true);
    expect(trigger.getAttribute('data-availability')).toBe('unavailable');
  });
});
