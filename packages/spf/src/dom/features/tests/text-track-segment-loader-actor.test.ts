import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TextTrack } from '../../../media/types';
import { createTextTrackSegmentLoaderActor } from '../text-track-segment-loader-actor';
import { createTextTracksActor } from '../text-tracks-actor';

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

  it('can be created and destroyed without error', () => {
    const video = makeMediaElement(['track-en']);
    const textTracksActor = createTextTracksActor(video);
    const actor = createTextTrackSegmentLoaderActor(textTracksActor);
    actor.destroy();
    textTracksActor.destroy();
  });

  it('does not fetch when no segments need loading', async () => {
    const { parseVttSegment } = await import('../../text/parse-vtt-segment');

    const video = makeMediaElement(['track-en']);
    const textTracksActor = createTextTracksActor(video);
    const actor = createTextTrackSegmentLoaderActor(textTracksActor);
    const track = makeResolvedTextTrack('track-en', []);

    actor.send({ type: 'load', track, currentTime: 0 });

    expect(parseVttSegment).not.toHaveBeenCalled();

    actor.destroy();
    textTracksActor.destroy();
  });

  it('delegates cue loading to TextTracksActor', async () => {
    const video = makeMediaElement(['track-en']);
    const textTracksActor = createTextTracksActor(video);
    const actor = createTextTrackSegmentLoaderActor(textTracksActor);
    const track = makeResolvedTextTrack('track-en', ['https://example.com/seg-0.vtt', 'https://example.com/seg-1.vtt']);

    actor.send({ type: 'load', track, currentTime: 0 });

    await vi.waitFor(() => {
      expect(textTracksActor.snapshot.get().context.segments['track-en']).toHaveLength(2);
    });

    expect(textTracksActor.snapshot.get().context.loaded['track-en']).toHaveLength(2);

    actor.destroy();
    textTracksActor.destroy();
  });

  it('skips already-loaded segments on repeat send()', async () => {
    const { parseVttSegment } = await import('../../text/parse-vtt-segment');

    const video = makeMediaElement(['track-en']);
    const textTracksActor = createTextTracksActor(video);
    const actor = createTextTrackSegmentLoaderActor(textTracksActor);
    const track = makeResolvedTextTrack('track-en', ['https://example.com/seg-0.vtt', 'https://example.com/seg-1.vtt']);

    actor.send({ type: 'load', track, currentTime: 0 });
    await vi.waitFor(() => expect(textTracksActor.snapshot.get().context.segments['track-en']).toHaveLength(2));
    expect(parseVttSegment).toHaveBeenCalledTimes(2);

    // Repeat send — all segments already in TextTracksActor context
    actor.send({ type: 'load', track, currentTime: 0 });
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
    const textTracksActor = createTextTracksActor(video);
    const actor = createTextTrackSegmentLoaderActor(textTracksActor);
    const track = makeResolvedTextTrack('track-en', [
      'https://example.com/seg-0.vtt',
      'https://example.com/fail.vtt',
      'https://example.com/seg-2.vtt',
    ]);

    actor.send({ type: 'load', track, currentTime: 0 });

    // Segments 0 and 2 succeeded; the failed segment is not recorded
    await vi.waitFor(() => expect(textTracksActor.snapshot.get().context.segments['track-en']).toHaveLength(2));
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load VTT segment:', expect.any(Error));

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
    const textTracksActor = createTextTracksActor(video);
    const actor = createTextTrackSegmentLoaderActor(textTracksActor);

    const track1 = makeResolvedTextTrack('track-en', ['https://example.com/seg-0.vtt']);
    const track2 = makeResolvedTextTrack('track-es', ['https://example.com/seg-1.vtt']);

    // Start loading track1 — paused waiting for seg0
    actor.send({ type: 'load', track: track1, currentTime: 0 });

    // Wait for the Task to actually start running
    await vi.waitFor(() => expect(parseVttSegment).toHaveBeenCalledTimes(1));

    // Switch to track2 — preempts track1
    actor.send({ type: 'load', track: track2, currentTime: 0 });

    // Unblock seg0 — signal is already aborted, so the cue is discarded
    resolveSeg0([]);

    // track-es completes
    await vi.waitFor(() => expect(textTracksActor.snapshot.get().context.segments['track-es']).toHaveLength(1));

    // track-en was preempted — no cues recorded
    expect(textTracksActor.snapshot.get().context.segments['track-en']).toBeUndefined();

    actor.destroy();
    textTracksActor.destroy();
  });

  it('does not schedule work after destroy()', async () => {
    const { parseVttSegment } = await import('../../text/parse-vtt-segment');

    const video = makeMediaElement(['track-en']);
    const textTracksActor = createTextTracksActor(video);
    const actor = createTextTrackSegmentLoaderActor(textTracksActor);
    const track = makeResolvedTextTrack('track-en', ['https://example.com/seg-0.vtt']);

    actor.destroy();
    actor.send({ type: 'load', track, currentTime: 0 });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(parseVttSegment).not.toHaveBeenCalled();

    textTracksActor.destroy();
  });
});
