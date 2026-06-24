import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HTMLMediaTargetLike } from '../../media-host';
import { CuePoints } from '..';

// jsdom does not implement VTTCue or persist text-track cues, so this suite
// runs against small deterministic fakes for the surface the component touches.

class FakeVTTCue {
  id = '';
  constructor(
    public startTime: number,
    public endTime: number,
    public text: string
  ) {}
}

class FakeTextTrack extends EventTarget {
  kind = 'metadata';
  label = '';
  mode: 'hidden' | 'showing' | 'disabled' = 'disabled';
  cues: FakeVTTCue[] = [];
  activeCues: FakeVTTCue[] = [];

  addCue(cue: FakeVTTCue): void {
    this.cues.push(cue);
    this.cues.sort((a, b) => a.startTime - b.startTime);
  }

  removeCue(cue: FakeVTTCue): void {
    this.cues = this.cues.filter((c) => c !== cue);
  }
}

class FakeTrackElement {
  track = new FakeTextTrack();
  #attrs = new Map<string, string>();

  set kind(value: string) {
    this.track.kind = value;
  }
  set label(value: string) {
    this.track.label = value;
  }

  setAttribute(name: string, value: string): void {
    this.#attrs.set(name, value);
  }
  getAttribute(name: string): string | null {
    return this.#attrs.get(name) ?? null;
  }
}

class FakeMedia extends EventTarget {
  currentTime = 0;
  duration = Number.NaN;
  textTracks = new EventTarget();
  trackEls: FakeTrackElement[] = [];

  append(el: FakeTrackElement): void {
    this.trackEls.push(el);
  }

  querySelectorAll(selector: string): FakeTrackElement[] {
    return selector === 'track' ? this.trackEls : [];
  }

  get cuePointsTrack(): FakeTextTrack | undefined {
    return this.trackEls[0]?.track;
  }
}

function createMedia(duration = Number.NaN): FakeMedia {
  const media = new FakeMedia();
  media.duration = duration;
  return media;
}

function asTarget(media: FakeMedia): HTMLMediaTargetLike {
  return media as unknown as HTMLMediaTargetLike;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

beforeEach(() => {
  vi.stubGlobal('VTTCue', FakeVTTCue);
  const realCreateElement = document.createElement.bind(document);
  vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...rest: unknown[]) => {
    if (tag === 'track') return new FakeTrackElement() as unknown as HTMLElement;
    return realCreateElement(tag, ...(rest as [ElementCreationOptions?]));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('CuePoints', () => {
  it('exposes the config key', () => {
    expect(CuePoints.configKey).toBe('cuePoints');
  });

  it('stages cue points before attach and applies them on attach', async () => {
    const media = createMedia(100);
    const cuePoints = new CuePoints({ cuePoints: [{ time: 10, value: { a: 1 } }] });

    expect(cuePoints.cuePoints).toEqual([{ time: 10, value: { a: 1 } }]);

    cuePoints.attach(asTarget(media));
    await flush();

    const track = media.cuePointsTrack!;
    expect(track.kind).toBe('metadata');
    expect(track.label).toBe('cuepoints');
    expect(track.mode).toBe('hidden');
    expect(cuePoints.cuePoints).toEqual([{ time: 10, value: { a: 1 } }]);
  });

  it('uses a custom track label', async () => {
    const media = createMedia(100);
    const cuePoints = new CuePoints({ label: 'ads', cuePoints: [{ time: 5, value: 'x' }] });

    cuePoints.attach(asTarget(media));
    await flush();

    expect(media.cuePointsTrack!.label).toBe('ads');
  });

  describe('writing cue points', () => {
    it('derives end times from following cue points and the media duration', async () => {
      const media = createMedia(100);
      const cuePoints = new CuePoints({
        cuePoints: [
          { time: 10, value: 'a' },
          { time: 20, value: 'b' },
          { time: 30, value: 'c' },
        ],
      });

      cuePoints.attach(asTarget(media));
      await flush();

      expect(media.cuePointsTrack!.cues.map((c) => [c.startTime, c.endTime])).toEqual([
        [10, 20],
        [20, 30],
        [30, 100],
      ]);
    });

    it('honors an explicit endTime', async () => {
      const media = createMedia(100);
      const cuePoints = new CuePoints({ cuePoints: [{ time: 10, endTime: 12, value: 'a' }] });

      cuePoints.attach(asTarget(media));
      await flush();

      const cue = media.cuePointsTrack!.cues[0]!;
      expect([cue.startTime, cue.endTime]).toEqual([10, 12]);
    });

    it('uses MAX_SAFE_INTEGER when duration is not finite', async () => {
      const media = createMedia(Number.NaN);
      const cuePoints = new CuePoints({ cuePoints: [{ time: 5, value: 'a' }] });

      cuePoints.attach(asTarget(media));
      await flush();

      expect(media.cuePointsTrack!.cues[0]!.endTime).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('dispatches a change event on the text track list', async () => {
      const media = createMedia(100);
      const onChange = vi.fn();
      media.textTracks.addEventListener('change', onChange);

      const cuePoints = new CuePoints({ cuePoints: [{ time: 10, value: 'a' }] });
      cuePoints.attach(asTarget(media));
      await flush();

      expect(onChange).toHaveBeenCalled();
    });
  });

  describe('addCuePoints', () => {
    it('appends to the existing set and adjusts the previous cue', async () => {
      const media = createMedia(100);
      const cuePoints = new CuePoints({
        cuePoints: [
          { time: 10, value: 'a' },
          { time: 30, value: 'c' },
        ],
      });

      cuePoints.attach(asTarget(media));
      await flush();

      await cuePoints.addCuePoints([{ time: 20, value: 'b' }]);

      expect(media.trackEls).toHaveLength(1);
      expect(media.cuePointsTrack!.cues.map((c) => [c.startTime, c.endTime])).toEqual([
        [10, 20],
        [20, 30],
        [30, 100],
      ]);
    });

    it('does not duplicate cues when a reload runs mid-append', async () => {
      const media = createMedia(100);
      const cuePoints = new CuePoints({ cuePoints: [{ time: 10, value: 'a' }] });
      cuePoints.attach(asTarget(media));
      await flush();

      // Simulate the engine dropping the cue-points track on reload, forcing
      // addCuePoints down the async track-creation path.
      media.trackEls = [];

      // Start the append, then fire `loadstart` before it settles so #setup
      // rewrites the full list while addCuePoints is still awaiting the track.
      const appended = cuePoints.addCuePoints([{ time: 20, value: 'b' }]);
      media.dispatchEvent(new Event('loadstart'));
      await appended;
      await flush();

      expect(media.cuePointsTrack!.cues.map((c) => c.startTime)).toEqual([10, 20]);
    });

    it('does not mutate the caller array', async () => {
      const media = createMedia(100);
      const cuePoints = new CuePoints();
      cuePoints.attach(asTarget(media));
      await flush();

      const input = [
        { time: 30, value: 'c' },
        { time: 10, value: 'a' },
      ];
      await cuePoints.addCuePoints(input);

      expect(input.map((c) => c.time)).toEqual([30, 10]);
    });
  });

  describe('cuePoints setter', () => {
    it('replaces previously set cue points', async () => {
      const media = createMedia(100);
      const cuePoints = new CuePoints({ cuePoints: [{ time: 10, value: 'a' }] });
      cuePoints.attach(asTarget(media));
      await flush();

      cuePoints.cuePoints = [{ time: 40, value: 'd' }];
      await flush();

      expect(cuePoints.cuePoints).toEqual([{ time: 40, value: 'd' }]);
    });

    it('clears cue points when set to an empty array', async () => {
      const media = createMedia(100);
      const cuePoints = new CuePoints({ cuePoints: [{ time: 10, value: 'a' }] });
      cuePoints.attach(asTarget(media));
      await flush();

      cuePoints.cuePoints = [];
      await flush();

      expect(cuePoints.cuePoints).toEqual([]);
      expect(media.cuePointsTrack!.cues).toHaveLength(0);
    });
  });

  describe('activeCuePoint', () => {
    it('returns undefined when there are no active cues', async () => {
      const media = createMedia(100);
      const cuePoints = new CuePoints({ cuePoints: [{ time: 10, value: 'a' }] });
      cuePoints.attach(asTarget(media));
      await flush();

      expect(cuePoints.activeCuePoint).toBeUndefined();
    });

    it('returns the single active cue point', async () => {
      const media = createMedia(100);
      const cuePoints = new CuePoints({ cuePoints: [{ time: 10, value: 'a' }] });
      cuePoints.attach(asTarget(media));
      await flush();

      media.cuePointsTrack!.activeCues = [new FakeVTTCue(10, 20, JSON.stringify('a'))];

      expect(cuePoints.activeCuePoint).toEqual({ time: 10, value: 'a' });
    });

    it('resolves the cue covering the current time among multiple active cues', async () => {
      const media = createMedia(100);
      media.currentTime = 12;
      const cuePoints = new CuePoints({ cuePoints: [{ time: 10, value: 'a' }] });
      cuePoints.attach(asTarget(media));
      await flush();

      media.cuePointsTrack!.activeCues = [
        new FakeVTTCue(0, 5, JSON.stringify('stale')),
        new FakeVTTCue(10, 15, JSON.stringify('current')),
      ];

      expect(cuePoints.activeCuePoint).toEqual({ time: 10, value: 'current' });
    });

    it('falls back to the first active cue when none cover the current time', async () => {
      const media = createMedia(100);
      media.currentTime = 7;
      const cuePoints = new CuePoints({ cuePoints: [{ time: 10, value: 'a' }] });
      cuePoints.attach(asTarget(media));
      await flush();

      media.cuePointsTrack!.activeCues = [
        new FakeVTTCue(0, 5, JSON.stringify('first')),
        new FakeVTTCue(20, 25, JSON.stringify('second')),
      ];

      expect(cuePoints.activeCuePoint).toEqual({ time: 0, value: 'first' });
    });
  });

  describe('cuepointchange events', () => {
    it('re-emits cuechange as cuepointchange on the media element', async () => {
      const media = createMedia(100);
      const onCuePointChange = vi.fn();
      media.addEventListener('cuepointchange', onCuePointChange as EventListener);

      const cuePoints = new CuePoints({ cuePoints: [{ time: 5, value: { id: 'x' } }] });
      cuePoints.attach(asTarget(media));
      await flush();

      const track = media.cuePointsTrack!;
      track.activeCues = [new FakeVTTCue(5, 10, JSON.stringify({ id: 'x' }))];
      track.dispatchEvent(new Event('cuechange'));

      expect(onCuePointChange).toHaveBeenCalledTimes(1);
      expect((onCuePointChange.mock.calls[0]![0] as CustomEvent).detail).toEqual({ time: 5, value: { id: 'x' } });
    });

    it('does not emit duplicates after a loadstart re-setup', async () => {
      const media = createMedia(100);
      const onCuePointChange = vi.fn();
      media.addEventListener('cuepointchange', onCuePointChange as EventListener);

      const cuePoints = new CuePoints({ cuePoints: [{ time: 5, value: 'a' }] });
      cuePoints.attach(asTarget(media));
      await flush();

      media.dispatchEvent(new Event('loadstart'));
      await flush();

      const track = media.cuePointsTrack!;
      track.activeCues = [new FakeVTTCue(5, 10, JSON.stringify('a'))];
      track.dispatchEvent(new Event('cuechange'));

      expect(onCuePointChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('lifecycle', () => {
    it('stops emitting and creating tracks after detach', async () => {
      const media = createMedia(100);
      const onCuePointChange = vi.fn();
      media.addEventListener('cuepointchange', onCuePointChange as EventListener);

      const cuePoints = new CuePoints({ cuePoints: [{ time: 5, value: 'a' }] });
      cuePoints.attach(asTarget(media));
      await flush();

      const track = media.cuePointsTrack!;
      cuePoints.detach();

      track.activeCues = [new FakeVTTCue(5, 10, JSON.stringify('a'))];
      track.dispatchEvent(new Event('cuechange'));
      media.dispatchEvent(new Event('loadstart'));
      await flush();

      expect(onCuePointChange).not.toHaveBeenCalled();
      expect(media.trackEls).toHaveLength(1);
    });

    it('does not write cue points or bind listeners if destroyed before setup completes', async () => {
      const media = createMedia(100);
      const onCuePointChange = vi.fn();
      media.addEventListener('cuepointchange', onCuePointChange as EventListener);

      const cuePoints = new CuePoints({ cuePoints: [{ time: 5, value: 'a' }] });
      cuePoints.attach(asTarget(media));
      cuePoints.destroy();
      await flush();

      const track = media.cuePointsTrack;
      expect(track?.cues ?? []).toHaveLength(0);

      if (track) {
        track.activeCues = [new FakeVTTCue(5, 10, JSON.stringify('a'))];
        track.dispatchEvent(new Event('cuechange'));
      }
      expect(onCuePointChange).not.toHaveBeenCalled();
    });
  });
});
