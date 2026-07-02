import { describe, expect, it } from 'vitest';
import { signal } from '../../../core/signals/primitives';
import {
  type AudioTrack,
  isResolvedTrack,
  type MaybeResolvedPresentation,
  MEDIA_PLAYLIST_METADATA_KEY,
  type PartiallyResolvedTextTrack,
  type Presentation,
  type ResolvedTrack,
  type VideoTrack,
} from '../../../media/types';
import { findTrack } from '../../../media/utils/tracks';
import { type AnchorPresentationTimelineConfig, makeAnchorPresentationTimeline } from '../anchor-presentation-timeline';

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
    // First audio segment's PDT trails video's by 2s — placement is by PDT.
    startDate: 1002,
    segments: [{ id: 'audio-85', url: 'https://example.com/a85.m4s', duration: 4, startTime: 0, startDate: 1002 }],
    groupId: 'aud',
    name: 'English',
    sampleRate: 48_000,
    channels: 2,
    metadata: META,
  };
}

// Not-yet-resolved text shell (no segments) — exercises the stamp-the-anchor path.
function makeTextShell(): PartiallyResolvedTextTrack {
  return {
    type: 'text',
    id: 't-1',
    url: 'https://example.com/subs.m3u8',
    mimeType: 'text/vtt',
    bandwidth: 0,
    groupId: 'sub',
    label: 'English',
    kind: 'subtitles',
  };
}

function makePresentation(tracks: (ResolvedTrack | PartiallyResolvedTextTrack)[]): Presentation {
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

function run(opts: { presentation?: MaybeResolvedPresentation; config?: AnchorPresentationTimelineConfig }) {
  const state = {
    presentation: signal<MaybeResolvedPresentation | undefined>(opts.presentation),
    presentationAnchor: signal<number | undefined>(undefined),
  };
  // The manual `Behavior<>` literal widens the setup return to `BehaviorCleanup`;
  // narrow back to the reactor's destroy handle for teardown.
  const reactor = makeAnchorPresentationTimeline().setup({ state, context: {}, config: opts.config ?? {} }) as {
    destroy: () => void;
  };
  return { cleanup: () => reactor.destroy(), state };
}

// Let the reactor's monitor re-run after a signal write (effects re-run on a microtask).
const flush = () => Promise.resolve();

function resolved(presentation: MaybeResolvedPresentation, type: ResolvedTrack['type'], id: string) {
  const track = findTrack(presentation, type, id);
  expect(track && isResolvedTrack(track)).toBe(true);
  return track as ResolvedTrack;
}

describe('anchorPresentationTimeline', () => {
  it('does nothing until a track has buffer ground truth', () => {
    // No resolveBufferedAnchor → never anchors; the track keeps its raw timeline.
    const { cleanup, state } = run({ presentation: makePresentation([makeVideoTrack()]) });

    expect(resolved(state.presentation.get()!, 'video', 'v-1').startTime).toBe(0);
    expect(state.presentationAnchor.get()).toBeUndefined();

    cleanup();
  });

  it('establishes the shared anchor from the buffered track and stamps every track', () => {
    const { cleanup, state } = run({
      presentation: makePresentation([makeVideoTrack(), makeAudioTrack(), makeTextShell()]),
      // The resolver reports the buffered video segment + which track it's from;
      // the shared anchor (PDT 500 ↔ media-0) then places audio and stamps text.
      config: { resolveBufferedAnchor: () => ({ trackId: 'v-1', segmentId: 'segment-85', actualStart: 500 }) },
    });

    const presentation = state.presentation.get()!;
    // Shared anchor: video seg PDT 1000 − actualStart 500 = 500.
    expect(resolved(presentation, 'video', 'v-1').startTime).toBe(500);
    // Audio's first segment PDT 1002 → 1002 − 500 = 502 (the 2s offset survives).
    expect(resolved(presentation, 'audio', 'a-1').startTime).toBe(502);
    // Unresolved text shell: anchor stamped as startDate (no segments materialized),
    // so it resolves already on the shared timeline.
    const text = findTrack(presentation, 'text', 't-1');
    expect(text?.startDate).toBe(500);
    expect(isResolvedTrack(text!)).toBe(false);
    // The anchor is published for seekToLiveEdge to gate on.
    expect(state.presentationAnchor.get()).toBe(500);

    cleanup();
  });

  it('is inert when the buffered track id is not in the presentation', () => {
    const { cleanup, state } = run({
      presentation: makePresentation([makeVideoTrack()]),
      config: { resolveBufferedAnchor: () => ({ trackId: 'gone', segmentId: 'segment-85', actualStart: 500 }) },
    });

    expect(resolved(state.presentation.get()!, 'video', 'v-1').startTime).toBe(0);

    cleanup();
  });

  it('keeps the established anchor through a transient loss of buffer ground truth (sticky per source)', async () => {
    let hasBuffer = true;
    const { cleanup, state } = run({
      presentation: makePresentation([makeVideoTrack()]),
      config: {
        resolveBufferedAnchor: () =>
          hasBuffer ? { trackId: 'v-1', segmentId: 'segment-85', actualStart: 500 } : undefined,
      },
    });

    expect(state.presentationAnchor.get()).toBe(500);

    // Buffer ground truth momentarily vanishes (underrun / flush / seek), then a
    // reload fires. The established anchor must persist — dropping it re-opens the
    // seekToLiveEdge gate and re-fires its one-time live-edge seek. Only a source
    // change (unresolved presentation) reverts.
    hasBuffer = false;
    const carried = makeVideoTrack();
    carried.startTime = 500;
    carried.startDate = 500;
    carried.segments = [{ ...carried.segments[0]!, startTime: 500, startDate: 1000 }];
    state.presentation.set(makePresentation([carried]));
    await flush();
    await flush();

    expect(state.presentationAnchor.get()).toBe(500);

    cleanup();
  });

  it('reverts the anchor on a source change, then re-establishes for the new source', async () => {
    let actualStart = 500;
    const { cleanup, state } = run({
      presentation: makePresentation([makeVideoTrack()]),
      config: { resolveBufferedAnchor: () => ({ trackId: 'v-1', segmentId: 'segment-85', actualStart }) },
    });

    expect(state.presentationAnchor.get()).toBe(500);

    // Source change → presentation reset to an unresolved value: the anchor clears
    // so the new source re-gates the seek.
    state.presentation.set({ url: 'https://example.com/new.m3u8' });
    await flush();
    await flush();
    expect(state.presentationAnchor.get()).toBeUndefined();

    // New source resolves with its own buffer truth → re-establishes.
    actualStart = 700;
    state.presentation.set(makePresentation([makeVideoTrack()]));
    await flush();
    await flush();
    expect(state.presentationAnchor.get()).toBe(300); // video seg PDT 1000 − actualStart 700

    cleanup();
  });

  it('establishes once — a later reload is left to the parser (no re-establish even if buffer drifts)', async () => {
    let actualStart = 500;
    const { cleanup, state } = run({
      presentation: makePresentation([makeVideoTrack()]),
      config: { resolveBufferedAnchor: () => ({ trackId: 'v-1', segmentId: 'segment-85', actualStart }) },
    });

    expect(resolved(state.presentation.get()!, 'video', 'v-1').startTime).toBe(500);

    // Reload carrying the anchored timeline forward; the resolver now disagrees.
    actualStart = 600;
    const carried = makeVideoTrack();
    carried.startTime = 500;
    carried.startDate = 500;
    carried.segments = [{ ...carried.segments[0]!, startTime: 500, startDate: 1000 }];
    state.presentation.set(makePresentation([carried]));
    await flush();
    await flush();

    // Stays at 500 (entry doesn't re-fire while still anchored), not re-pinned to 400.
    expect(resolved(state.presentation.get()!, 'video', 'v-1').startTime).toBe(500);

    cleanup();
  });
});
