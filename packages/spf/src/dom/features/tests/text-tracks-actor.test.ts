import { describe, expect, it } from 'vitest';
import { TextTracksActor } from '../text-tracks-actor';

function makeMediaElement(trackIds: string[]): HTMLMediaElement {
  const video = document.createElement('video');
  for (const id of trackIds) {
    const el = document.createElement('track');
    el.id = id;
    el.kind = 'subtitles';
    video.appendChild(el);
  }
  return video;
}

describe('TextTracksActor', () => {
  it('starts with idle status and empty loaded context', () => {
    const video = makeMediaElement(['track-en']);
    const actor = new TextTracksActor(video);

    expect(actor.snapshot.get().status).toBe('idle');
    expect(actor.snapshot.get().context.loaded).toEqual({});
  });

  it('adds cues to the correct TextTrack', () => {
    const video = makeMediaElement(['track-en']);
    const actor = new TextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;
    textTrack.mode = 'hidden';

    actor.send({ type: 'add-cues', trackId: 'track-en', cues: [new VTTCue(0, 2, 'Hello')] });

    expect(textTrack.cues?.length).toBe(1);
  });

  it('records added cues in snapshot context', () => {
    const video = makeMediaElement(['track-en']);
    const actor = new TextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;
    textTrack.mode = 'hidden';

    actor.send({ type: 'add-cues', trackId: 'track-en', cues: [new VTTCue(0, 2, 'Hello'), new VTTCue(2, 4, 'World')] });

    const loaded = actor.snapshot.get().context.loaded['track-en'];
    expect(loaded).toHaveLength(2);
    expect(loaded![0]).toMatchObject({ startTime: 0, endTime: 2, text: 'Hello' });
    expect(loaded![1]).toMatchObject({ startTime: 2, endTime: 4, text: 'World' });
  });

  it('deduplicates cues by startTime + endTime + text', () => {
    const video = makeMediaElement(['track-en']);
    const actor = new TextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;
    textTrack.mode = 'hidden';

    actor.send({ type: 'add-cues', trackId: 'track-en', cues: [new VTTCue(0, 2, 'Hello')] });
    actor.send({ type: 'add-cues', trackId: 'track-en', cues: [new VTTCue(0, 2, 'Hello')] });

    expect(textTrack.cues?.length).toBe(1);
    expect(actor.snapshot.get().context.loaded['track-en']).toHaveLength(1);
  });

  it('does not deduplicate cues with different text at the same time range', () => {
    const video = makeMediaElement(['track-en']);
    const actor = new TextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;
    textTrack.mode = 'hidden';

    actor.send({ type: 'add-cues', trackId: 'track-en', cues: [new VTTCue(0, 2, 'Hello')] });
    actor.send({ type: 'add-cues', trackId: 'track-en', cues: [new VTTCue(0, 2, 'Hola')] });

    expect(textTrack.cues?.length).toBe(2);
  });

  it('does not update snapshot when all cues are duplicates', () => {
    const video = makeMediaElement(['track-en']);
    const actor = new TextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;
    textTrack.mode = 'hidden';

    actor.send({ type: 'add-cues', trackId: 'track-en', cues: [new VTTCue(0, 2, 'Hello')] });
    const snapshotAfterFirst = actor.snapshot.get();

    actor.send({ type: 'add-cues', trackId: 'track-en', cues: [new VTTCue(0, 2, 'Hello')] });

    expect(actor.snapshot.get()).toBe(snapshotAfterFirst);
  });

  it('tracks cues independently per track ID', () => {
    const video = makeMediaElement(['track-en', 'track-es']);
    const actor = new TextTracksActor(video);
    for (const t of Array.from(video.textTracks)) t.mode = 'hidden';

    actor.send({ type: 'add-cues', trackId: 'track-en', cues: [new VTTCue(0, 2, 'Hello')] });
    actor.send({ type: 'add-cues', trackId: 'track-es', cues: [new VTTCue(0, 2, 'Hola'), new VTTCue(2, 4, 'Mundo')] });

    expect(actor.snapshot.get().context.loaded['track-en']).toHaveLength(1);
    expect(actor.snapshot.get().context.loaded['track-es']).toHaveLength(2);
  });

  it('is a no-op when trackId is not found in textTracks', () => {
    const video = makeMediaElement(['track-en']);
    const actor = new TextTracksActor(video);

    actor.send({ type: 'add-cues', trackId: 'nonexistent', cues: [new VTTCue(0, 2, 'Hello')] });

    expect(actor.snapshot.get().context.loaded).toEqual({});
  });

  it('transitions to destroyed on destroy()', () => {
    const video = makeMediaElement(['track-en']);
    const actor = new TextTracksActor(video);

    actor.destroy();

    expect(actor.snapshot.get().status).toBe('destroyed');
  });

  it('ignores send() after destroy()', () => {
    const video = makeMediaElement(['track-en']);
    const actor = new TextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;
    textTrack.mode = 'hidden';

    actor.destroy();
    actor.send({ type: 'add-cues', trackId: 'track-en', cues: [new VTTCue(0, 2, 'Hello')] });

    expect(textTrack.cues?.length ?? 0).toBe(0);
    expect(actor.snapshot.get().context.loaded).toEqual({});
  });

  it('snapshot is reactive — updates are observable via signal', () => {
    const video = makeMediaElement(['track-en']);
    const actor = new TextTracksActor(video);
    const textTrack = Array.from(video.textTracks).find((t) => t.id === 'track-en')!;
    textTrack.mode = 'hidden';

    const snapshots: ReturnType<typeof actor.snapshot.get>[] = [];
    // Read initial value
    snapshots.push(actor.snapshot.get());

    actor.send({ type: 'add-cues', trackId: 'track-en', cues: [new VTTCue(0, 2, 'Hello')] });
    snapshots.push(actor.snapshot.get());

    expect(snapshots[0]!.context.loaded['track-en']).toBeUndefined();
    expect(snapshots[1]!.context.loaded['track-en']).toHaveLength(1);
  });
});
