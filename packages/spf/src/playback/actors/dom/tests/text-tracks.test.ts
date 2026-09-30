import { describe, expect, it, vi } from 'vite-plus/test';

import type { CueSegmentMeta } from '../text-tracks';
import { createTextTracksActor } from '../text-tracks';

async function makeMediaElement(trackIds: string[]): Promise<HTMLMediaElement> {
  const video = document.createElement('video');

  for (const id of trackIds) {
    const el = document.createElement('track');

    el.id = id;
    el.kind = 'subtitles';
    video.appendChild(el);
    el.track.mode = 'hidden';

    await vi.waitFor(() => expect(el.readyState).toBe(HTMLTrackElement.ERROR));
  }

  return video;
}

function meta(trackId: string, id: string, startTime = 0, duration = 10): CueSegmentMeta {
  return { trackId, id, startTime, duration };
}

describe('createTextTracksActor', () => {
  it('starts with active status and empty context', async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);

    expect(actor.snapshot.get().value).toBe('active');
    expect(actor.snapshot.get().context.loaded).toEqual({});
    expect(actor.snapshot.get().context.segments).toEqual({});
  });

  it('adds cues to the correct TextTrack', async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;

    textTrack.mode = 'hidden';

    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0'), cues: [new VTTCue(0, 2, 'Hello')] });

    expect(textTrack.cues?.length).toBe(1);
  });

  it('preserves cues sent before a srcless native track settles', async () => {
    const video = document.createElement('video');
    const el = document.createElement('track');

    el.id = 'track-en';
    el.kind = 'subtitles';
    video.appendChild(el);
    document.body.appendChild(video);
    el.track.mode = 'showing';

    const actor = createTextTracksActor(video);

    try {
      expect(el.hasAttribute('src')).toBe(false);
      expect(el.readyState).toBe(HTMLTrackElement.NONE);

      actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0'), cues: [new VTTCue(0, 2, 'Hello')] });

      await vi.waitFor(() => expect(el.readyState).toBe(HTMLTrackElement.ERROR));

      // SAFETY: This slot only contains the VTTCue sent to the actor above.
      expect(Array.from(el.track.cues ?? [], (cue) => (cue as VTTCue).text)).toEqual(['Hello']);
      expect(actor.snapshot.get().context.segments['track-en']).toEqual([{ id: 'seg-0', startTime: 0, duration: 10 }]);
    } finally {
      actor.destroy();
      video.remove();
    }
  });

  it('records added cues in snapshot context', async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;

    textTrack.mode = 'hidden';

    actor.send({
      type: 'add-cues',
      meta: meta('track-en', 'seg-0'),
      cues: [new VTTCue(0, 2, 'Hello'), new VTTCue(2, 4, 'World')],
    });

    const loaded = actor.snapshot.get().context.loaded['track-en'];

    expect(loaded).toHaveLength(2);
    expect(loaded![0]).toMatchObject({ startTime: 0, endTime: 2, text: 'Hello' });
    expect(loaded![1]).toMatchObject({ startTime: 2, endTime: 4, text: 'World' });
  });

  it('records segment in snapshot context', async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;

    textTrack.mode = 'hidden';

    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0', 0, 10), cues: [new VTTCue(0, 2, 'Hello')] });
    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-1', 10, 10), cues: [new VTTCue(2, 4, 'World')] });

    expect(actor.snapshot.get().context.segments['track-en']).toEqual([
      { id: 'seg-0', startTime: 0, duration: 10 },
      { id: 'seg-1', startTime: 10, duration: 10 },
    ]);
  });

  it('deduplicates cues by startTime + endTime + text', async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;

    textTrack.mode = 'hidden';

    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0', 0, 10), cues: [new VTTCue(0, 2, 'Hello')] });
    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-1', 10, 10), cues: [new VTTCue(0, 2, 'Hello')] });

    expect(textTrack.cues?.length).toBe(1);
    expect(actor.snapshot.get().context.loaded['track-en']).toHaveLength(1);
  });

  it('deduplicates segments by id', async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;

    textTrack.mode = 'hidden';

    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0'), cues: [new VTTCue(0, 2, 'Hello')] });
    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0'), cues: [new VTTCue(0, 2, 'Hello')] });

    expect(actor.snapshot.get().context.segments['track-en']).toHaveLength(1);
  });

  it('does not update snapshot when both cues and segment are already recorded', async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;

    textTrack.mode = 'hidden';

    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0'), cues: [new VTTCue(0, 2, 'Hello')] });
    const snapshotAfterFirst = actor.snapshot.get();

    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0'), cues: [new VTTCue(0, 2, 'Hello')] });

    expect(actor.snapshot.get()).toBe(snapshotAfterFirst);
  });

  it('does not deduplicate cues with different text at the same time range', async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;

    textTrack.mode = 'hidden';

    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0', 0, 10), cues: [new VTTCue(0, 2, 'Hello')] });
    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-1', 10, 10), cues: [new VTTCue(0, 2, 'Hola')] });

    expect(textTrack.cues?.length).toBe(2);
  });

  it('tracks cues and segments independently per track ID', async () => {
    const video = await makeMediaElement(['track-en', 'track-es']);
    const actor = createTextTracksActor(video);

    for (const t of Array.from(video.textTracks)) t.mode = 'hidden';

    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0'), cues: [new VTTCue(0, 2, 'Hello')] });
    actor.send({
      type: 'add-cues',
      meta: meta('track-es', 'seg-0'),
      cues: [new VTTCue(0, 2, 'Hola'), new VTTCue(2, 4, 'Mundo')],
    });

    expect(actor.snapshot.get().context.loaded['track-en']).toHaveLength(1);
    expect(actor.snapshot.get().context.loaded['track-es']).toHaveLength(2);
    expect(actor.snapshot.get().context.segments['track-en']).toEqual([{ id: 'seg-0', startTime: 0, duration: 10 }]);
    expect(actor.snapshot.get().context.segments['track-es']).toEqual([{ id: 'seg-0', startTime: 0, duration: 10 }]);
  });

  it('is a no-op when trackId is not found in textTracks', async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);

    actor.send({ type: 'add-cues', meta: meta('nonexistent', 'seg-0'), cues: [new VTTCue(0, 2, 'Hello')] });

    expect(actor.snapshot.get().context.loaded).toEqual({});
    expect(actor.snapshot.get().context.segments).toEqual({});
  });

  it('transitions to destroyed on destroy()', async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);

    actor.destroy();

    expect(actor.snapshot.get().value).toBe('destroyed');
  });

  it('ignores send() after destroy()', async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;

    textTrack.mode = 'hidden';

    actor.destroy();
    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0'), cues: [new VTTCue(0, 2, 'Hello')] });

    expect(textTrack.cues?.length ?? 0).toBe(0);
    expect(actor.snapshot.get().context.loaded).toEqual({});
    expect(actor.snapshot.get().context.segments).toEqual({});
  });

  it("'clear' message wipes loaded + segments context", async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;

    textTrack.mode = 'hidden';

    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0'), cues: [new VTTCue(0, 2, 'Hello')] });
    expect(actor.snapshot.get().context.loaded['track-en']).toHaveLength(1);
    expect(actor.snapshot.get().context.segments['track-en']).toHaveLength(1);

    actor.send({ type: 'clear' });

    expect(actor.snapshot.get().context.loaded).toEqual({});
    expect(actor.snapshot.get().context.segments).toEqual({});
  });

  it("after 'clear', a reused trackId can re-load segments (regression: stale cache across source resets)", async () => {
    // The actor's lifecycle is bound to mediaElement, so its cache
    // survives source resets. Without a clear on source reset,
    // `getSegmentsToLoad` (which reads the actor's `segments` snapshot)
    // would treat the new source's segments as already-buffered and
    // skip loading them.
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;

    textTrack.mode = 'hidden';

    // Source A: track-en has seg-0 + seg-1.
    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0', 0, 10), cues: [new VTTCue(0, 2, 'A0')] });
    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-1', 10, 10), cues: [new VTTCue(10, 12, 'A1')] });
    expect(actor.snapshot.get().context.segments['track-en']).toHaveLength(2);

    // Source unload — `syncTextTracks` clears the actor's cache.
    actor.send({ type: 'clear' });

    // Source B: same trackId, fresh segment with same id as one in A.
    // The cache should accept it as new (no dedup against A's segment).
    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0', 0, 10), cues: [new VTTCue(0, 2, 'B0')] });
    expect(actor.snapshot.get().context.segments['track-en']).toEqual([{ id: 'seg-0', startTime: 0, duration: 10 }]);
    expect(actor.snapshot.get().context.loaded['track-en']?.[0]?.text).toBe('B0');
  });

  it('snapshot is reactive — updates are tracked via signal', async () => {
    const video = await makeMediaElement(['track-en']);
    const actor = createTextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;

    textTrack.mode = 'hidden';

    const snapshots: ReturnType<typeof actor.snapshot.get>[] = [];

    snapshots.push(actor.snapshot.get());

    actor.send({ type: 'add-cues', meta: meta('track-en', 'seg-0', 0, 10), cues: [new VTTCue(0, 2, 'Hello')] });
    snapshots.push(actor.snapshot.get());

    expect(snapshots[0]!.context.loaded['track-en']).toBeUndefined();
    expect(snapshots[1]!.context.loaded['track-en']).toHaveLength(1);
    expect(snapshots[0]!.context.segments['track-en']).toBeUndefined();
    expect(snapshots[1]!.context.segments['track-en']).toEqual([{ id: 'seg-0', startTime: 0, duration: 10 }]);
  });
});
