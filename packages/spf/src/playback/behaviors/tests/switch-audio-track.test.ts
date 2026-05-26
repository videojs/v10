import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { AudioSelectionSet, AudioTrack, MaybeResolvedPresentation, Presentation } from '../../../media/types';
import { switchAudioTrack } from '../switch-audio-track';

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

interface SwitchAudioTrackState {
  presentation?: MaybeResolvedPresentation;
  selectedAudioTrackId?: string;
  userAudioTrackSelection?: Partial<AudioTrack>;
}

function makeState(initial: SwitchAudioTrackState = {}): StateSignals<SwitchAudioTrackState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    selectedAudioTrackId: signal<string | undefined>(initial.selectedAudioTrackId),
    userAudioTrackSelection: signal<Partial<AudioTrack> | undefined>(initial.userAudioTrackSelection),
  };
}

function createAudioPresentation(tracks: AudioTrack[]): Presentation {
  return {
    id: 'pres-1',
    url: 'http://example.com/playlist.m3u8',
    selectionSets: [
      {
        id: 'audio-set',
        type: 'audio' as const,
        switchingSets: [
          {
            id: 'audio-switching',
            type: 'audio' as const,
            tracks,
          },
        ],
      } as AudioSelectionSet,
    ],
    startTime: 0,
  };
}

function makeAudioTrack(id: string, overrides: Partial<AudioTrack> = {}): AudioTrack {
  return {
    type: 'audio',
    id,
    url: `http://example.com/${id}.m3u8`,
    bandwidth: 128_000,
    mimeType: 'audio/mp4',
    codecs: ['mp4a.40.2'],
    groupId: 'audio',
    name: id,
    sampleRate: 48000,
    channels: 2,
    startTime: 0,
    duration: 10,
    initialization: { url: `http://example.com/${id}-init.mp4` },
    segments: [],
    ...overrides,
  };
}

// ----------------------------------------------------------------------------
// Selection lifecycle
// ----------------------------------------------------------------------------

describe('switchAudioTrack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selects the first audio track when no preference or filter', async () => {
    const state = makeState({
      presentation: createAudioPresentation([makeAudioTrack('audio-en', { language: 'en' })]),
    });

    const reactor = switchAudioTrack.setup({ state });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    reactor.destroy();
  });

  it('picks track matching preferredAudioLanguage when supplied', async () => {
    const state = makeState({
      presentation: createAudioPresentation([
        makeAudioTrack('audio-en', { language: 'en' }),
        makeAudioTrack('audio-es', { language: 'es' }),
      ]),
    });

    const reactor = switchAudioTrack.setup({ state, config: { preferredAudioLanguage: 'es' } });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    reactor.destroy();
  });

  it('clears selectedAudioTrackId on src unload', async () => {
    const state = makeState({
      presentation: createAudioPresentation([makeAudioTrack('audio-en', { language: 'en' })]),
    });

    const reactor = switchAudioTrack.setup({ state });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    state.presentation.set(undefined);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBeUndefined();

    reactor.destroy();
  });
});

// ----------------------------------------------------------------------------
// Filter reactivity (userAudioTrackSelection)
// ----------------------------------------------------------------------------

describe('switchAudioTrack — userAudioTrackSelection filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('narrows candidates by filter (language)', async () => {
    const state = makeState({
      presentation: createAudioPresentation([
        makeAudioTrack('audio-en', { language: 'en' }),
        makeAudioTrack('audio-es', { language: 'es' }),
      ]),
      userAudioTrackSelection: { language: 'es' },
    });

    const reactor = switchAudioTrack.setup({ state });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    reactor.destroy();
  });

  it('re-picks on filter change mid-presentation', async () => {
    const state = makeState({
      presentation: createAudioPresentation([
        makeAudioTrack('audio-en', { language: 'en' }),
        makeAudioTrack('audio-es', { language: 'es' }),
      ]),
    });

    const reactor = switchAudioTrack.setup({ state });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    state.userAudioTrackSelection.set({ language: 'es' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    reactor.destroy();
  });

  it('filter narrowing to a single track short-circuits the picker', async () => {
    const state = makeState({
      presentation: createAudioPresentation([
        makeAudioTrack('audio-en', { language: 'en' }),
        makeAudioTrack('audio-es', { language: 'es' }),
      ]),
      userAudioTrackSelection: { id: 'audio-es' },
    });

    const reactor = switchAudioTrack.setup({ state });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-es');

    reactor.destroy();
  });

  it('empty filter result falls back to unfiltered candidate set', async () => {
    const state = makeState({
      presentation: createAudioPresentation([makeAudioTrack('audio-en', { language: 'en' })]),
      userAudioTrackSelection: { language: 'es' }, // no Spanish track exists
    });

    const reactor = switchAudioTrack.setup({ state });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(state.selectedAudioTrackId.get()).toBe('audio-en');

    reactor.destroy();
  });
});
