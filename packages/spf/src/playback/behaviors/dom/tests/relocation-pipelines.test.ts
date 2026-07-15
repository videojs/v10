import { describe, expect, it } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import { initSegment, mediaSegment, trak } from '../../../../media/mp4/tests/synthetic-boxes';
import type { MediaContainerData } from '../../../../media/types';
import type { Frame, StepDeps } from '../../../primitives/segment-load-pipeline';
import { deriveSharedMinStartMediaTime } from '../../establish-start-media-time';
import { relocationPipelinesFor } from '../relocation-pipelines';

// A caption-first muxing: the `clcp` traf precedes the media traf, so a
// first-`traf` read would pair the media track's timescale with the caption
// track's baseMediaDecodeTime (300000/6000 = 50s) instead of its own
// (60000/6000 = 10s). Track-id matching is what keeps the origin honest here.
const captionFirstInit = initSegment(
  trak({ handler: 'clcp', trackId: 2, timescale: 30000 }),
  trak({ handler: 'vide', trackId: 1, timescale: 6000 })
);
const captionFirstSegment = mediaSegment(
  { trackId: 2, baseMediaDecodeTime: 300000 }, // captions first
  { trackId: 1, baseMediaDecodeTime: 60000 } // media track second
);

async function* streamOf(bytes: Uint8Array): AsyncIterable<Uint8Array> {
  yield bytes;
}

function makeDeps(): {
  deps: StepDeps;
  slot: ReturnType<typeof signal<Record<string, MediaContainerData> | undefined>>;
} {
  const slot = signal<Record<string, MediaContainerData> | undefined>(undefined);
  return { deps: { state: { mediaContainerData: slot }, context: {}, config: {} }, slot };
}

/** The discover steps at their pipeline positions: `[fetch, discover, dispatch]`. */
function discoverSteps(trackType: 'video' | 'audio') {
  const pipelines = relocationPipelinesFor(trackType, deriveSharedMinStartMediaTime)();
  return { readInitTrackInfo: pipelines['append-init'][1]!, readSegmentOrigin: pipelines['append-segment'][1]! };
}

describe('relocationPipelinesFor', () => {
  it('matches the media track by track_id across a muxed init and segment', async () => {
    const { deps, slot } = makeDeps();
    const { readInitTrackInfo, readSegmentOrigin } = discoverSteps('video');
    const signalNotAborted = new AbortController().signal;

    const initFrame = {
      op: { type: 'append-init', meta: { trackId: 'v', language: undefined }, url: 'init.mp4' },
      data: streamOf(captionFirstInit),
    } as unknown as Frame;
    await readInitTrackInfo(initFrame, signalNotAborted, deps);

    // The `vide` track — id 1, timescale 6000 — not the caption track (id 2).
    expect(slot.get()?.video).toEqual({ trackId: 1, timescale: 6000 });

    const segmentFrame = {
      op: { type: 'append-segment', meta: { id: 's0', startTime: 0, duration: 6, trackId: 'v' } },
      data: streamOf(captionFirstSegment),
    } as unknown as Frame;
    await readSegmentOrigin(segmentFrame, signalNotAborted, deps);

    // Track 1's tfdt (60000), never the caption track's (300000).
    const video = slot.get()?.video;
    expect(video?.baseMediaDecodeTime).toBe(60000);
    expect(video!.baseMediaDecodeTime! / video!.timescale!).toBe(10);
  });

  it('leaves the append native when the init has no matching media track', async () => {
    const { deps, slot } = makeDeps();
    const { readInitTrackInfo, readSegmentOrigin } = discoverSteps('audio');
    const signalNotAborted = new AbortController().signal;

    // Video-only muxing: no `soun` track for the audio pipeline to match.
    const initFrame = {
      op: { type: 'append-init', meta: { trackId: 'a', language: undefined }, url: 'init.mp4' },
      data: streamOf(captionFirstInit),
    } as unknown as Frame;
    await readInitTrackInfo(initFrame, signalNotAborted, deps);
    expect(slot.get()?.audio).toBeUndefined();

    // Without a discovered track_id, the segment step no-ops (no origin to relocate by).
    const segmentFrame = {
      op: { type: 'append-segment', meta: { id: 's0', startTime: 0, duration: 6, trackId: 'a' } },
      data: streamOf(captionFirstSegment),
    } as unknown as Frame;
    await readSegmentOrigin(segmentFrame, signalNotAborted, deps);
    expect(slot.get()?.audio?.baseMediaDecodeTime).toBeUndefined();
  });
});
