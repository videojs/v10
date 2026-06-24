import { describe, expect, it, vi } from 'vitest';
import { signal } from '../../../core/signals/primitives';
import {
  type AudioTrack,
  isResolvedTrack,
  type MaybeResolvedPresentation,
  MEDIA_PLAYLIST_METADATA_KEY,
  type Presentation,
  type ResolvedTrack,
  type TextTrack,
  type VideoTrack,
} from '../../../media/types';
import { findTrack } from '../../../media/utils/tracks';
import { type AnchorLiveTracksConfig, makeAnchorLiveTracks } from '../anchor-live-tracks';

const META = { [MEDIA_PLAYLIST_METADATA_KEY]: { mediaSequence: 85, targetDuration: 5, endList: false } };

function makeVideoTrack(): VideoTrack {
  return {
    type: 'video',
    id: 'v-1',
    url: 'https://example.com/video.m3u8',
    mimeType: 'video/mp4',
    codecs: ['avc1.640020'],
    bandwidth: 1_000_000,
    initialization: { url: 'https://example.com/init.mp4' },
    duration: Number.POSITIVE_INFINITY,
    startTime: 0,
    startDate: 1000,
    segments: [{ id: 'segment-85', url: 'https://example.com/85.m4s', duration: 4, startTime: 0, startDate: 1000 }],
    metadata: META,
  };
}

function makeAudioTrack(): AudioTrack {
  return {
    type: 'audio',
    id: 'a-1',
    url: 'https://example.com/audio.m3u8',
    mimeType: 'audio/mp4',
    codecs: ['mp4a.40.2'],
    bandwidth: 128_000,
    initialization: { url: 'https://example.com/audio-init.mp4' },
    duration: Number.POSITIVE_INFINITY,
    startTime: 0,
    // First audio segment's PDT trails video's by 2s — placement is by PDT, so
    // this offset must survive anchoring.
    startDate: 1002,
    segments: [{ id: 'audio-85', url: 'https://example.com/a85.m4s', duration: 4, startTime: 0, startDate: 1002 }],
    groupId: 'aud',
    name: 'English',
    sampleRate: 48_000,
    channels: 2,
    metadata: META,
  };
}

function makeTextTrack(): TextTrack {
  return {
    type: 'text',
    id: 't-1',
    url: 'https://example.com/subs.m3u8',
    mimeType: 'text/vtt',
    bandwidth: 0,
    duration: Number.POSITIVE_INFINITY,
    startTime: 0,
    startDate: 1000,
    segments: [{ id: 'text-85', url: 'https://example.com/t85.vtt', duration: 4, startTime: 0, startDate: 1000 }],
    groupId: 'sub',
    label: 'English',
    kind: 'subtitles',
    metadata: META,
  };
}

function makePresentation(tracks: ResolvedTrack[]): Presentation {
  const selectionSets = (['video', 'audio', 'text'] as const).flatMap((type) => {
    const typed = tracks.filter((track) => track.type === type);
    return typed.length
      ? [{ id: `${type}-set`, type, switchingSets: [{ id: `${type}-ss`, type, tracks: typed }] }]
      : [];
  });
  // The flatMap widens each set's `type` to the union; cast back to the
  // discriminated `Presentation` (the constituent tracks are already typed).
  return { id: 'pres-1', url: 'https://example.com/master.m3u8', startTime: 0, selectionSets } as Presentation;
}

function run(opts: {
  presentation?: MaybeResolvedPresentation;
  videoId?: string;
  audioId?: string;
  textId?: string;
  config?: AnchorLiveTracksConfig;
}) {
  // Built as a var (not an inline literal) so the defensively-read
  // `selected*TrackId` slots aren't rejected by the excess-property check
  // against the behavior's declared `{ presentation }` state slice.
  const state = {
    presentation: signal<MaybeResolvedPresentation | undefined>(opts.presentation),
    selectedVideoTrackId: signal<string | undefined>(opts.videoId),
    selectedAudioTrackId: signal<string | undefined>(opts.audioId),
    selectedTextTrackId: signal<string | undefined>(opts.textId),
  };
  // The manual `Behavior<>` literal widens the setup return to `BehaviorCleanup`;
  // narrow back to the reactor's destroy handle for teardown.
  const reactor = makeAnchorLiveTracks().setup({ state, context: {}, config: opts.config ?? {} }) as {
    destroy: () => void;
  };
  return { cleanup: () => reactor.destroy(), state };
}

// Let the reactor's effects re-run after a signal write (they re-run on a microtask).
const flush = () => Promise.resolve();

function resolved(presentation: MaybeResolvedPresentation, type: ResolvedTrack['type'], id: string) {
  const track = findTrack(presentation, type, id);
  expect(track && isResolvedTrack(track)).toBe(true);
  return track as ResolvedTrack;
}

describe('anchorLiveTracks', () => {
  it('anchors the selected track to the estimated stream origin', () => {
    const { cleanup, state } = run({ presentation: makePresentation([makeVideoTrack()]), videoId: 'v-1' });

    const track = resolved(state.presentation.get()!, 'video', 'v-1');
    // origin offset = (85 − 0) × 4 = 340; idempotent (no double-application).
    expect(track.startTime).toBe(340);
    expect(track.segments[0]?.startTime).toBe(340);
    // startDate re-based to the seq-0 wall clock: 1000 − 340 = 660.
    expect(track.startDate).toBe(660);

    cleanup();
  });

  it('no-ops when the track carries no startDate', () => {
    const track = makeVideoTrack();
    track.startDate = undefined;
    track.segments = [{ id: 'segment-85', url: 'https://example.com/85.m4s', duration: 4, startTime: 0 }];
    const { cleanup, state } = run({ presentation: makePresentation([track]), videoId: 'v-1' });

    expect(findTrack(state.presentation.get()!, 'video', 'v-1')?.startTime).toBe(0);

    cleanup();
  });

  it('no-ops without a selected track', () => {
    const { cleanup, state } = run({ presentation: makePresentation([makeVideoTrack()]) });

    expect(findTrack(state.presentation.get()!, 'video', 'v-1')?.startTime).toBe(0);

    cleanup();
  });

  describe('buffer pin', () => {
    it('pins the track onto the actual buffered position, overriding the estimate', () => {
      const { cleanup, state } = run({
        presentation: makePresentation([makeVideoTrack()]),
        videoId: 'v-1',
        config: { resolveBufferedAnchor: () => ({ segmentId: 'segment-85', actualStart: 500 }) },
      });

      const track = resolved(state.presentation.get()!, 'video', 'v-1');
      // Buffer wins over the estimate (which would place it at 340).
      expect(track.startTime).toBe(500);
      expect(track.segments[0]?.startTime).toBe(500);

      cleanup();
    });

    it('places audio and text from one A/V buffer pin, each by its own PDT', () => {
      const { cleanup, state } = run({
        presentation: makePresentation([makeVideoTrack(), makeAudioTrack(), makeTextTrack()]),
        videoId: 'v-1',
        audioId: 'a-1',
        textId: 't-1',
        // Only video has a SourceBuffer; the shared anchor (PDT 500 ↔ media-0)
        // places audio and text too.
        config: {
          resolveBufferedAnchor: (track) =>
            track.type === 'video' ? { segmentId: 'segment-85', actualStart: 500 } : undefined,
        },
      });

      const presentation = state.presentation.get()!;
      // Shared anchor: video seg PDT 1000 − actualStart 500 = 500 (PDT at media-0).
      expect(resolved(presentation, 'video', 'v-1').startTime).toBe(500);
      // Audio's first segment PDT is 1002 → 1002 − 500 = 502 (the 2s offset survives).
      expect(resolved(presentation, 'audio', 'a-1').startTime).toBe(502);
      // Text PDT 1000 → 1000 − 500 = 500.
      expect(resolved(presentation, 'text', 't-1').startTime).toBe(500);

      cleanup();
    });

    it('first selected A/V track to buffer wins (video preferred over audio)', () => {
      const { cleanup, state } = run({
        presentation: makePresentation([makeVideoTrack(), makeAudioTrack()]),
        videoId: 'v-1',
        audioId: 'a-1',
        // Both report buffer truth, disagreeing: video → anchor 500, audio → 602.
        config: {
          resolveBufferedAnchor: (track) =>
            track.type === 'video'
              ? { segmentId: 'segment-85', actualStart: 500 }
              : { segmentId: 'audio-85', actualStart: 400 },
        },
      });

      const presentation = state.presentation.get()!;
      // Video wins: shared anchor 500, so audio rides it (1002 − 500 = 502), not
      // its own (1002 − 400 = 602).
      expect(resolved(presentation, 'video', 'v-1').startTime).toBe(500);
      expect(resolved(presentation, 'audio', 'a-1').startTime).toBe(502);

      cleanup();
    });

    it('upgrades from the estimate to the buffer pin once ground truth arrives', async () => {
      let bufferReady = false;
      const { cleanup, state } = run({
        presentation: makePresentation([makeVideoTrack()]),
        videoId: 'v-1',
        config: {
          resolveBufferedAnchor: () => (bufferReady ? { segmentId: 'segment-85', actualStart: 500 } : undefined),
        },
      });

      // Bootstrap: estimate places it at 340.
      expect(resolved(state.presentation.get()!, 'video', 'v-1').startTime).toBe(340);

      // Buffer ground truth appears; a reload re-checks it and upgrades the anchor.
      bufferReady = true;
      state.presentation.set(makePresentation([makeVideoTrack()]));
      await flush();
      await flush();

      expect(resolved(state.presentation.get()!, 'video', 'v-1').startTime).toBe(500);

      cleanup();
    });

    it('pins once — a later reload is left to the parser (no re-pin even if the anchor drifts)', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      let actualStart = 500;
      const { cleanup, state } = run({
        presentation: makePresentation([makeVideoTrack()]),
        videoId: 'v-1',
        config: { resolveBufferedAnchor: () => ({ segmentId: 'segment-85', actualStart }) },
      });

      expect(resolved(state.presentation.get()!, 'video', 'v-1').startTime).toBe(500);

      // Reload carrying the pinned timeline forward; the resolver now disagrees.
      actualStart = 600;
      const carried = makeVideoTrack();
      carried.startTime = 500;
      carried.startDate = 500;
      carried.segments = [{ ...carried.segments[0]!, startTime: 500, startDate: 1000 }];
      state.presentation.set(makePresentation([carried]));
      await flush();
      await flush();

      // Maintain mode: stays at 500 (the parser owns carry-forward), not re-pinned to 600.
      expect(resolved(state.presentation.get()!, 'video', 'v-1').startTime).toBe(500);

      cleanup();
      warn.mockRestore();
    });
  });
});
