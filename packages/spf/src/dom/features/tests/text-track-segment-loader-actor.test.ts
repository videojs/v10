import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextTrack } from '../../../core/types';
import { TextTrackSegmentLoaderActor } from '../text-track-segment-loader-actor';
import { TextTracksActor } from '../text-tracks-actor';

vi.mock('../../text/parse-vtt-segment', () => ({
  parseVttSegment: vi.fn((url: string) => {
    if (url.includes('fail')) {
      return Promise.reject(new Error('Network error'));
    }
    return Promise.resolve([new VTTCue(0, 5, `Cue from ${url}`)]);
  }),
  destroyVttParser: vi.fn(),
}));

function makeMediaElement(trackIds: string[]): HTMLMediaElement {
  const video = document.createElement('video');
  for (const id of trackIds) {
    const el = document.createElement('track');
    el.id = id;
    el.kind = 'subtitles';
    video.appendChild(el);
    el.track.mode = 'hidden';
  }
  return video;
}

function makeResolvedTextTrack(id: string, segmentUrls: string[]): TextTrack {
  return {
    type: 'text',
    id,
    url: 'https://example.com/text.m3u8',
    mimeType: 'text/vtt',
    bandwidth: 0,
    groupId: 'subs',
    label: 'English',
    kind: 'subtitles',
    language: 'en',
    startTime: 0,
    duration: segmentUrls.length * 10,
    segments: segmentUrls.map((url, i) => ({
      id: `seg-${i}`,
      url,
      duration: 10,
      startTime: i * 10,
    })),
  };
}

describe('TextTrackSegmentLoaderActor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with idle status and empty context', () => {
    const video = makeMediaElement(['track-en']);
    const textTracksActor = new TextTracksActor(video);
    const actor = new TextTrackSegmentLoaderActor(textTracksActor);

    expect(actor.snapshot.get().status).toBe('idle');
    expect(actor.snapshot.get().context).toEqual({});

    actor.destroy();
    textTracksActor.destroy();
  });

  it('stays idle when no segments need loading', () => {
    const video = makeMediaElement(['track-en']);
    const textTracksActor = new TextTracksActor(video);
    const actor = new TextTrackSegmentLoaderActor(textTracksActor);
    const track = makeResolvedTextTrack('track-en', []);

    actor.send({ type: 'load', track, currentTime: 0 });

    expect(actor.snapshot.get().status).toBe('idle');

    actor.destroy();
    textTracksActor.destroy();
  });

  it('transitions loading → idle after all segments are fetched', async () => {
    const video = makeMediaElement(['track-en']);
    const textTracksActor = new TextTracksActor(video);
    const actor = new TextTrackSegmentLoaderActor(textTracksActor);
    const track = makeResolvedTextTrack('track-en', ['https://example.com/seg-0.vtt']);

    actor.send({ type: 'load', track, currentTime: 0 });
    expect(actor.snapshot.get().status).toBe('loading');

    await vi.waitFor(() => {
      expect(actor.snapshot.get().status).toBe('idle');
    });

    actor.destroy();
    textTracksActor.destroy();
  });

  it('delegates cue loading to TextTracksActor', async () => {
    const video = makeMediaElement(['track-en']);
    const textTracksActor = new TextTracksActor(video);
    const actor = new TextTrackSegmentLoaderActor(textTracksActor);
    const track = makeResolvedTextTrack('track-en', ['https://example.com/seg-0.vtt', 'https://example.com/seg-1.vtt']);

    actor.send({ type: 'load', track, currentTime: 0 });

    await vi.waitFor(() => {
      expect(actor.snapshot.get().status).toBe('idle');
    });

    expect(textTracksActor.snapshot.get().context.segments['track-en']).toHaveLength(2);
    expect(textTracksActor.snapshot.get().context.loaded['track-en']).toHaveLength(2);

    actor.destroy();
    textTracksActor.destroy();
  });

  it('skips already-loaded segments on repeat send()', async () => {
    const { parseVttSegment } = await import('../../text/parse-vtt-segment');

    const video = makeMediaElement(['track-en']);
    const textTracksActor = new TextTracksActor(video);
    const actor = new TextTrackSegmentLoaderActor(textTracksActor);
    const track = makeResolvedTextTrack('track-en', ['https://example.com/seg-0.vtt', 'https://example.com/seg-1.vtt']);

    actor.send({ type: 'load', track, currentTime: 0 });
    await vi.waitFor(() => expect(actor.snapshot.get().status).toBe('idle'));
    expect(parseVttSegment).toHaveBeenCalledTimes(2);

    // Repeat send — all segments already in TextTracksActor context
    actor.send({ type: 'load', track, currentTime: 0 });
    expect(actor.snapshot.get().status).toBe('idle');
    expect(parseVttSegment).toHaveBeenCalledTimes(2);

    actor.destroy();
    textTracksActor.destroy();
  });

  it('continues loading remaining segments after a fetch error', async () => {
    const { parseVttSegment } = await import('../../text/parse-vtt-segment');
    vi.mocked(parseVttSegment)
      .mockResolvedValueOnce([new VTTCue(0, 5, 'Good')])
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([new VTTCue(20, 25, 'Also good')]);

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const video = makeMediaElement(['track-en']);
    const textTracksActor = new TextTracksActor(video);
    const actor = new TextTrackSegmentLoaderActor(textTracksActor);
    const track = makeResolvedTextTrack('track-en', [
      'https://example.com/seg-0.vtt',
      'https://example.com/fail.vtt',
      'https://example.com/seg-2.vtt',
    ]);

    actor.send({ type: 'load', track, currentTime: 0 });

    await vi.waitFor(() => expect(actor.snapshot.get().status).toBe('idle'));

    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load VTT segment:', expect.any(Error));
    // Segments 0 and 2 succeeded; the failed segment is not recorded
    expect(textTracksActor.snapshot.get().context.segments['track-en']).toHaveLength(2);

    consoleErrorSpy.mockRestore();
    actor.destroy();
    textTracksActor.destroy();
  });

  it('preempts in-flight work when a new send() arrives', async () => {
    const { parseVttSegment } = await import('../../text/parse-vtt-segment');

    let resolveSeg0!: (cues: VTTCue[]) => void;
    vi.mocked(parseVttSegment)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSeg0 = resolve;
          })
      )
      .mockResolvedValue([new VTTCue(0, 5, 'Cue')]);

    const video = makeMediaElement(['track-en', 'track-es']);
    const textTracksActor = new TextTracksActor(video);
    const actor = new TextTrackSegmentLoaderActor(textTracksActor);

    const track1 = makeResolvedTextTrack('track-en', ['https://example.com/seg-0.vtt']);
    const track2 = makeResolvedTextTrack('track-es', ['https://example.com/seg-1.vtt']);

    // Start loading track1 — paused waiting for seg0
    actor.send({ type: 'load', track: track1, currentTime: 0 });
    expect(actor.snapshot.get().status).toBe('loading');

    // Wait for the Task to actually start running — resolveSeg0 is assigned inside
    // the Promise constructor, which executes when parseVttSegment is called async.
    await vi.waitFor(() => expect(parseVttSegment).toHaveBeenCalledTimes(1));

    // Switch to track2 — preempts track1
    actor.send({ type: 'load', track: track2, currentTime: 0 });

    // Unblock seg0 — signal is already aborted, so the cue is discarded
    resolveSeg0([]);

    await vi.waitFor(() => expect(actor.snapshot.get().status).toBe('idle'));

    // track-en was preempted — no cues recorded
    expect(textTracksActor.snapshot.get().context.segments['track-en']).toBeUndefined();
    // track-es completed successfully
    expect(textTracksActor.snapshot.get().context.segments['track-es']).toHaveLength(1);

    actor.destroy();
    textTracksActor.destroy();
  });

  it('transitions to destroyed on destroy()', () => {
    const video = makeMediaElement(['track-en']);
    const textTracksActor = new TextTracksActor(video);
    const actor = new TextTrackSegmentLoaderActor(textTracksActor);

    actor.destroy();

    expect(actor.snapshot.get().status).toBe('destroyed');

    textTracksActor.destroy();
  });

  it('ignores send() after destroy()', async () => {
    const { parseVttSegment } = await import('../../text/parse-vtt-segment');

    const video = makeMediaElement(['track-en']);
    const textTracksActor = new TextTracksActor(video);
    const actor = new TextTrackSegmentLoaderActor(textTracksActor);
    const track = makeResolvedTextTrack('track-en', ['https://example.com/seg-0.vtt']);

    actor.destroy();
    actor.send({ type: 'load', track, currentTime: 0 });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(parseVttSegment).not.toHaveBeenCalled();
    expect(actor.snapshot.get().status).toBe('destroyed');

    textTracksActor.destroy();
  });

  it('snapshot is reactive — status transitions are observable via signal', async () => {
    const video = makeMediaElement(['track-en']);
    const textTracksActor = new TextTracksActor(video);
    const actor = new TextTrackSegmentLoaderActor(textTracksActor);
    const track = makeResolvedTextTrack('track-en', ['https://example.com/seg-0.vtt']);

    const observed = [actor.snapshot.get().status];

    actor.send({ type: 'load', track, currentTime: 0 });
    observed.push(actor.snapshot.get().status);

    await vi.waitFor(() => expect(actor.snapshot.get().status).toBe('idle'));
    observed.push(actor.snapshot.get().status);

    expect(observed).toEqual(['idle', 'loading', 'idle']);

    actor.destroy();
    textTracksActor.destroy();
  });
});
