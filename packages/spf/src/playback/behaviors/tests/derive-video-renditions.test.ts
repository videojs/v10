import { describe, expect, it } from 'vitest';
import type { StateSignals } from '../../../core/composition/create-composition';
import { signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation, PartiallyResolvedVideoTrack, Presentation } from '../../../media/types';
import type { VideoRenditionInfo } from '../../../media/utils/track-selection';
import { type DeriveVideoRenditionsState, deriveVideoRenditions } from '../derive-video-renditions';

function makeState(initial: Partial<DeriveVideoRenditionsState> = {}): StateSignals<DeriveVideoRenditionsState> {
  return {
    presentation: signal<MaybeResolvedPresentation | undefined>(initial.presentation),
    videoRenditions: signal<VideoRenditionInfo[] | undefined>(initial.videoRenditions),
  };
}

const track = (id: string, width: number, height: number, bandwidth: number): PartiallyResolvedVideoTrack => ({
  type: 'video',
  id,
  url: `${id}.m3u8`,
  codecs: ['avc1.640028'],
  mimeType: 'video/mp4',
  bandwidth,
  width,
  height,
});

const presentationWith = (tracks: PartiallyResolvedVideoTrack[]): Presentation =>
  ({
    id: 'pres-1',
    url: 'https://example.com/master.m3u8',
    startTime: 0,
    selectionSets: [
      {
        id: 'video-set',
        type: 'video' as const,
        switchingSets: [{ id: 'video-switching', type: 'video' as const, tracks }],
      },
    ],
  }) as Presentation;

const HD = track('v-1080', 1920, 1080, 6_000_000);
const SD = track('v-360', 640, 360, 800_000);

const flush = () => Promise.resolve().then(() => Promise.resolve());

describe('deriveVideoRenditions', () => {
  it('does nothing without a presentation', async () => {
    const state = makeState();
    const reactor = deriveVideoRenditions.setup({ state });
    await flush();
    expect(state.videoRenditions.get()).toBeUndefined();
    reactor.destroy();
  });

  it('publishes the video renditions on src load', async () => {
    const state = makeState({ presentation: presentationWith([HD, SD]) });
    const reactor = deriveVideoRenditions.setup({ state });
    await flush();

    expect(state.videoRenditions.get()?.map((r) => r.id)).toEqual(['v-1080', 'v-360']);
    expect(state.videoRenditions.get()?.map((r) => r.height)).toEqual([1080, 360]);
    reactor.destroy();
  });

  it('skips the write when a reload carries the same rendition set', async () => {
    const state = makeState({ presentation: presentationWith([HD, SD]) });
    const reactor = deriveVideoRenditions.setup({ state });
    await flush();
    const first = state.videoRenditions.get();

    // A live reload swaps in a new presentation object with identical renditions.
    state.presentation.set(presentationWith([HD, SD]));
    await flush();

    expect(state.videoRenditions.get()).toBe(first);
    reactor.destroy();
  });

  it('clears the renditions on src unload', async () => {
    const state = makeState({ presentation: presentationWith([HD, SD]) });
    const reactor = deriveVideoRenditions.setup({ state });
    await flush();
    expect(state.videoRenditions.get()).toBeDefined();

    state.presentation.set(undefined);
    await flush();

    expect(state.videoRenditions.get()).toBeUndefined();
    reactor.destroy();
  });
});
