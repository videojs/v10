'use client';

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CAPTIONS_OFF_VALUE } from '@videojs/core';
import { registerI18n, resetI18nRegistry } from '@videojs/core/i18n';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../../i18n';
import { PlayerContextProvider, type PlayerContextValue } from '../../../player/context';
import { createPlayerWrapper } from '../../../testing/mocks';
import { Menu } from '../../menu';
import { useCaptionsOptions } from '../use-captions-options';

afterEach(() => {
  resetI18nRegistry();
  cleanup();
});

function renderCaptionsMenu({
  textTrackList = [
    { kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' },
    { kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'showing' },
  ] as const,
  subtitlesShowing = true,
  selectSubtitlesTrack = vi.fn(),
  locale,
}: {
  textTrackList?: readonly { kind: string; label: string; language: string; mode: string }[];
  subtitlesShowing?: boolean;
  selectSubtitlesTrack?: (value: string) => void;
  locale?: string | undefined;
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
  const content = (
    <Menu.Root defaultOpen align="center">
      <Menu.Content data-testid="content">
        <CaptionsRadioGroup />
      </Menu.Content>
    </Menu.Root>
  );

  render(locale ? <I18nProvider locale={locale}>{content}</I18nProvider> : content, { wrapper: Wrapper });

  return { selectSubtitlesTrack };
}

function createReactiveTextTrackWrapper(initialState: Record<string, unknown>) {
  const listeners = new Set<() => void>();
  const store = {
    state: initialState,
    subscribe: (callback: () => void) => {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    attach: vi.fn(() => vi.fn()),
    destroy: vi.fn(),
  };

  const value: PlayerContextValue = {
    store: store as unknown as PlayerContextValue['store'],
    media: null,
    setMedia: vi.fn(),
    container: null,
    setContainer: vi.fn(),
  };

  return {
    updateState(next: Record<string, unknown>) {
      store.state = next;
      for (const listener of listeners) listener();
    },
    Wrapper({ children }: { children: ReactNode }) {
      return <PlayerContextProvider value={value}>{children}</PlayerContextProvider>;
    },
  };
}

function CaptionsAvailability(): ReactNode {
  const captions = useCaptionsOptions();
  return <div data-testid="availability">{captions?.state.availability ?? 'missing'}</div>;
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

  it('translates default track labels', () => {
    registerI18n('xx', {
      Captions: 'Captions translated',
    });

    renderCaptionsMenu({
      textTrackList: [
        { kind: 'captions', label: '', language: '', mode: 'disabled' },
        { kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'showing' },
      ],
      locale: 'xx',
    });

    expect(screen.getByRole('menuitemradio', { name: 'Captions translated' })).toBeTruthy();
  });

  it('turns captions off', () => {
    const selectSubtitlesTrack = vi.fn();
    renderCaptionsMenu({ selectSubtitlesTrack });

    fireEvent.click(screen.getByRole('menuitemradio', { name: 'Off' }));

    expect(selectSubtitlesTrack).toHaveBeenCalledWith(CAPTIONS_OFF_VALUE);
  });

  it('updates when caption tracks become available', () => {
    const { Wrapper, updateState } = createReactiveTextTrackWrapper({
      chaptersCues: [],
      thumbnailCues: [],
      thumbnailTrackSrc: null,
      textTrackList: [],
      subtitlesShowing: false,
      selectSubtitlesTrack: vi.fn(),
      toggleSubtitles: vi.fn(),
    });

    render(<CaptionsAvailability />, { wrapper: Wrapper });

    expect(screen.getByTestId('availability').textContent).toBe('unavailable');

    act(() => {
      updateState({
        chaptersCues: [],
        thumbnailCues: [],
        thumbnailTrackSrc: null,
        textTrackList: [
          { kind: 'subtitles', label: 'English', language: 'en', mode: 'disabled' },
          { kind: 'subtitles', label: 'Spanish', language: 'es', mode: 'showing' },
        ],
        subtitlesShowing: true,
        selectSubtitlesTrack: vi.fn(),
        toggleSubtitles: vi.fn(),
      });
    });

    expect(screen.getByTestId('availability').textContent).toBe('available');
  });
});
