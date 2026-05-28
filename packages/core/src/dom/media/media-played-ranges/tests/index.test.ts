import { describe, expect, it } from 'vitest';
import { MediaLayer } from '../../../../core/media/media-layer';
import type { TimeRangeLike } from '../../../../core/media/types';
import { EMPTY_TIME_RANGES } from '../../constants';
import { mediaPlayedRanges } from '..';

class FakeMedia extends MediaLayer {
  currentTime = 0;
  paused = true;

  get played(): TimeRangeLike {
    return this.next?.played ?? EMPTY_TIME_RANGES;
  }

  play(time: number): void {
    this.paused = false;
    this.currentTime = time;
    this.dispatchEvent(new Event('play'));
  }

  tick(time: number): void {
    this.currentTime = time;
  }

  pause(time: number): void {
    this.currentTime = time;
    this.paused = true;
    this.dispatchEvent(new Event('pause'));
  }

  seek(target: number): void {
    this.dispatchEvent(new Event('seeking'));
    this.currentTime = target;
    this.dispatchEvent(new Event('seeked'));
  }

  end(time: number): void {
    this.currentTime = time;
    this.paused = true;
    this.dispatchEvent(new Event('ended'));
  }
}

function createTrackedMedia() {
  const media = new FakeMedia();
  mediaPlayedRanges().install(media);
  return media;
}

describe('mediaPlayedRanges', () => {
  it('starts with a single empty range', () => {
    const media = createTrackedMedia();
    expect(media.played.length).toBe(1);
    expect(media.played.start(0)).toBe(0);
    expect(media.played.end(0)).toBe(0);
  });

  it('tracks a contiguous play segment', () => {
    const media = createTrackedMedia();
    media.play(0);
    media.tick(5);
    media.pause(5);

    const played = media.played;
    expect(played.length).toBe(1);
    expect(played.start(0)).toBe(0);
    expect(played.end(0)).toBe(5);
  });

  it('merges adjacent ranges within the epsilon tolerance', () => {
    const media = createTrackedMedia();
    media.play(0);
    media.pause(5);
    media.play(5.2);
    media.pause(8);

    const played = media.played;
    expect(played.length).toBe(1);
    expect(played.end(0)).toBe(8);
  });

  it('keeps non-adjacent ranges separate', () => {
    const media = createTrackedMedia();
    media.play(0);
    media.pause(2);
    media.seek(20);
    media.play(20);
    media.pause(25);

    const played = media.played;
    expect(played.length).toBe(2);
    expect(played.start(0)).toBe(0);
    expect(played.end(0)).toBe(2);
    expect(played.start(1)).toBe(20);
    expect(played.end(1)).toBe(25);
  });

  it('commits a range on ended', () => {
    const media = createTrackedMedia();
    media.play(0);
    media.tick(10);
    media.end(10);
    expect(media.played.end(0)).toBe(10);
  });
});
