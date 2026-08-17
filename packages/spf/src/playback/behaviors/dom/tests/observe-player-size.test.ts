import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import {
  type ObservePlayerSizeConfig,
  observePlayerSize,
  type PlayerSizeContext,
  type PlayerSizeState,
} from '../observe-player-size';

const elements: HTMLElement[] = [];

/**
 * A laid-out `<video>`. Size has to come from a real box in a real document —
 * an element that isn't being rendered never gets an observation, which is
 * exactly the "no measurement" case one of the tests covers.
 */
function makeVideo(width: number, height: number): HTMLVideoElement {
  const element = document.createElement('video');
  element.style.display = 'block';
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  document.body.append(element);
  elements.push(element);
  return element;
}

function makeState(initial: PlayerSizeState = {}): StateSignals<PlayerSizeState> {
  return {
    playerWidth: signal<number | undefined>(initial.playerWidth),
    playerHeight: signal<number | undefined>(initial.playerHeight),
    playerScale: signal<number | undefined>(initial.playerScale),
  };
}

function makeContext(initial: PlayerSizeContext = {}): ContextSignals<PlayerSizeContext> {
  return {
    mediaElement: signal<HTMLMediaElement | undefined>(initial.mediaElement),
  };
}

function setupObservePlayerSize(initialContext: PlayerSizeContext = {}, config?: ObservePlayerSizeConfig) {
  const state = makeState();
  const context = makeContext(initialContext);
  const cleanup = observePlayerSize.setup({ state, context, config });
  return { state, context, cleanup };
}

/** The measured box, ignoring the scale (which is environment-dependent). */
function boxOf(state: StateSignals<PlayerSizeState>) {
  return { width: state.playerWidth.get(), height: state.playerHeight.get() };
}

afterEach(() => {
  vi.unstubAllGlobals();
  for (const element of elements.splice(0)) element.remove();
});

describe('observePlayerSize', () => {
  it('writes the rendered box of the attached media element', async () => {
    const mediaElement = makeVideo(320, 180);

    const { state, cleanup } = setupObservePlayerSize({ mediaElement });

    await vi.waitFor(() => expect(boxOf(state)).toEqual({ width: 320, height: 180 }));

    cleanup();
  });

  it('starts measuring when a media element is attached later', async () => {
    const { state, context, cleanup } = setupObservePlayerSize();

    await vi.waitFor(() => expect(boxOf(state)).toEqual({ width: undefined, height: undefined }));

    context.mediaElement.set(makeVideo(640, 360));

    await vi.waitFor(() => expect(boxOf(state)).toEqual({ width: 640, height: 360 }));

    cleanup();
  });

  it('re-measures when the element resizes', async () => {
    const mediaElement = makeVideo(320, 180);

    const { state, cleanup } = setupObservePlayerSize({ mediaElement });

    await vi.waitFor(() => expect(boxOf(state)).toEqual({ width: 320, height: 180 }));

    mediaElement.style.width = '1280px';
    mediaElement.style.height = '720px';

    await vi.waitFor(() => expect(boxOf(state)).toEqual({ width: 1280, height: 720 }));

    cleanup();
  });

  it('leaves the measurement unset for an unrendered element so the cap stays inert', async () => {
    const mediaElement = makeVideo(320, 180);
    mediaElement.style.display = 'none';

    const { state, cleanup } = setupObservePlayerSize({ mediaElement });

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(boxOf(state)).toEqual({ width: undefined, height: undefined });
    expect(state.playerScale.get()).toBeUndefined();

    cleanup();
  });

  it('clears the measurement when the media element is detached', async () => {
    const mediaElement = makeVideo(320, 180);

    const { state, context, cleanup } = setupObservePlayerSize({ mediaElement });

    await vi.waitFor(() => expect(boxOf(state)).toEqual({ width: 320, height: 180 }));

    context.mediaElement.set(undefined);

    await vi.waitFor(() => expect(boxOf(state)).toEqual({ width: undefined, height: undefined }));
    expect(state.playerScale.get()).toBeUndefined();

    cleanup();
  });

  it('stops measuring the previous element when it is replaced', async () => {
    const first = makeVideo(320, 180);
    const second = makeVideo(640, 360);

    const { state, context, cleanup } = setupObservePlayerSize({ mediaElement: first });

    await vi.waitFor(() => expect(boxOf(state)).toEqual({ width: 320, height: 180 }));

    context.mediaElement.set(second);
    await vi.waitFor(() => expect(boxOf(state)).toEqual({ width: 640, height: 360 }));

    first.style.width = '1920px';
    first.style.height = '1080px';
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(boxOf(state)).toEqual({ width: 640, height: 360 });

    cleanup();
  });

  it('records the device pixel ratio alongside the box, without applying it', async () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const mediaElement = makeVideo(320, 180);

    const { state, cleanup } = setupObservePlayerSize({ mediaElement });

    // The box stays in CSS pixels; scaling is the reader's call (capToPlayerSize).
    await vi.waitFor(() => expect(state.playerScale.get()).toBe(2));
    expect(boxOf(state)).toEqual({ width: 320, height: 180 });

    cleanup();
  });

  it('never measures when the cap is disabled', async () => {
    const mediaElement = makeVideo(320, 180);

    const { state, cleanup } = setupObservePlayerSize({ mediaElement }, { playerSizeCap: { enabled: false } });

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(boxOf(state)).toEqual({ width: undefined, height: undefined });
    expect(state.playerScale.get()).toBeUndefined();

    cleanup();
  });

  it('stops observing on cleanup', async () => {
    const mediaElement = makeVideo(320, 180);

    const { state, cleanup } = setupObservePlayerSize({ mediaElement });

    await vi.waitFor(() => expect(boxOf(state)).toEqual({ width: 320, height: 180 }));

    cleanup();

    mediaElement.style.width = '1280px';
    mediaElement.style.height = '720px';
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(boxOf(state)).toEqual({ width: 320, height: 180 });
  });
});
