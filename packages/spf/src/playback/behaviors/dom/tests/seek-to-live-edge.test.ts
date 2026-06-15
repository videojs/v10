import { describe, expect, it } from 'vitest';
import { signal } from '../../../../core/signals/primitives';
import { seekToLiveEdge } from '../seek-to-live-edge';

function makeFakeMedia(bufferedStart: number | null, currentTime: number): HTMLMediaElement {
  const buffered =
    bufferedStart === null
      ? { length: 0, start: () => 0, end: () => 0 }
      : { length: 1, start: () => bufferedStart, end: () => bufferedStart + 10 };
  return {
    currentTime,
    buffered,
    addEventListener() {},
    removeEventListener() {},
  } as unknown as HTMLMediaElement;
}

function run(media: HTMLMediaElement): () => void {
  return seekToLiveEdge.setup({
    state: {},
    context: { mediaElement: signal<HTMLMediaElement | undefined>(media) },
    config: {},
  }) as () => void;
}

describe('seekToLiveEdge', () => {
  it('seeks the playhead to the buffered window start when it sits before it', () => {
    const media = makeFakeMedia(1000, 0); // native-PTS gap: currentTime 0, buffered at 1000
    const cleanup = run(media);
    expect(media.currentTime).toBe(1000);
    cleanup();
  });

  it('does not seek when the playhead is already inside the buffered window', () => {
    const media = makeFakeMedia(1000, 1005);
    const cleanup = run(media);
    expect(media.currentTime).toBe(1005);
    cleanup();
  });

  it('does not seek when nothing is buffered yet', () => {
    const media = makeFakeMedia(null, 0);
    const cleanup = run(media);
    expect(media.currentTime).toBe(0);
    cleanup();
  });
});
