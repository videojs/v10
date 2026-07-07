import { describe, expect, it } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation, PartiallyResolvedAudioTrack, Presentation } from '../../../media/types';
import type { AudioTrackInfo } from '../../../media/utils/track-selection';
import { type DeriveAudioTracksState, deriveAudioTracks } from '../derive-audio-tracks';

function makeState(initial: Partial<DeriveAudioTracksState> = {}): StateSignals<DeriveAudioTracksState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    audioTracks: signal<AudioTrackInfo[] | undefined>(initial.audioTracks),
  };
}

const track = (id: string, language: string, name: string, groupId: string): PartiallyResolvedAudioTrack =>
  ({
    type: 'audio',
    id,
    url: `${id}.m3u8`,
    codecs: ['mp4a.40.2'],
    mimeType: 'audio/mp4',
    bandwidth: 128_000,
    groupId,
    name,
    language,
  }) as PartiallyResolvedAudioTrack;

const presentationWith = (tracks: PartiallyResolvedAudioTrack[]): Presentation =>
  ({
    id: 'pres-1',
    url: 'https://example.com/master.m3u8',
    startTime: 0,
    selectionSets: [
      {
        id: 'audio-set',
        type: 'audio' as const,
        switchingSets: [{ id: 'audio-switching', type: 'audio' as const, tracks }],
      },
    ],
  }) as Presentation;

// Two languages across two quality groups.
const AUDIO = [
  track('en-hi', 'en', 'English', 'audio-hi'),
  track('es-hi', 'es', 'Spanish', 'audio-hi'),
  track('en-lo', 'en', 'English', 'audio-lo'),
  track('es-lo', 'es', 'Spanish', 'audio-lo'),
];

const flush = () => Promise.resolve().then(() => Promise.resolve());

describe('deriveAudioTracks', () => {
  it('does nothing without a presentation', async () => {
    const state = makeState();
    const reactor = deriveAudioTracks.setup({ state });
    await flush();
    expect(state.audioTracks.get()).toBeUndefined();
    reactor.destroy();
  });

  it('publishes one audio track per language on src load', async () => {
    const state = makeState({ presentation: presentationWith(AUDIO) });
    const reactor = deriveAudioTracks.setup({ state });
    await flush();

    expect(state.audioTracks.get()?.map((t) => t.name)).toEqual(['English', 'Spanish']);
    expect(state.audioTracks.get()?.[0]?.trackIds).toEqual(['en-hi', 'en-lo']);
    reactor.destroy();
  });

  it('skips the write when a reload carries the same track set', async () => {
    const state = makeState({ presentation: presentationWith(AUDIO) });
    const reactor = deriveAudioTracks.setup({ state });
    await flush();
    const first = state.audioTracks.get();

    state.presentation.set(presentationWith(AUDIO));
    await flush();

    expect(state.audioTracks.get()).toBe(first);
    reactor.destroy();
  });

  it('clears the tracks on src unload', async () => {
    const state = makeState({ presentation: presentationWith(AUDIO) });
    const reactor = deriveAudioTracks.setup({ state });
    await flush();
    expect(state.audioTracks.get()).toBeDefined();

    state.presentation.set(undefined);
    await flush();

    expect(state.audioTracks.get()).toBeUndefined();
    reactor.destroy();
  });
});
