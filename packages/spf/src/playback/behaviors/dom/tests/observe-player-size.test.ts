import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import {
  type ObservePlayerSizeConfig,
  observePlayerSize,
  type PlayerSizeContext,
  type PlayerSizeState,
} from '../observe-player-size';

// Device-pixel scaling is environment-dependent (headless Chromium reports 1,
// a retina run reports 2), so every test that asserts an exact area opts out of
// it. The two DPR tests below stub `devicePixelRatio` and assert the scaling
// explicitly.
const CSS_PIXELS: ObservePlayerSizeConfig = { playerSizeCap: { useDevicePixelRatio: false } };

const elements: HTMLElement[] = [];

/**
 * A laid-out `<video>`. Size has to come from a real box in a real document —
 * `clientWidth`/`clientHeight` are 0 on a detached element, which is exactly the
 * "no measurement" case one of the tests covers.
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
    playerPixelArea: signal<number | undefined>(initial.playerPixelArea),
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

afterEach(() => {
  vi.unstubAllGlobals();
  for (const element of elements.splice(0)) element.remove();
});

describe('observePlayerSize', () => {
  it('writes the rendered area of the attached media element', async () => {
    const mediaElement = makeVideo(320, 180);

    const { state, cleanup } = setupObservePlayerSize({ mediaElement }, CSS_PIXELS);

    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBe(320 * 180));

    cleanup();
  });

  it('starts measuring when a media element is attached later', async () => {
    const { state, context, cleanup } = setupObservePlayerSize({}, CSS_PIXELS);

    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBeUndefined());

    context.mediaElement.set(makeVideo(640, 360));

    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBe(640 * 360));

    cleanup();
  });

  it('re-measures when the element resizes', async () => {
    const mediaElement = makeVideo(320, 180);

    const { state, cleanup } = setupObservePlayerSize({ mediaElement }, CSS_PIXELS);

    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBe(320 * 180));

    mediaElement.style.width = '1280px';
    mediaElement.style.height = '720px';

    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBe(1280 * 720));

    cleanup();
  });

  it('writes undefined for a zero-size element so the cap stays inert', async () => {
    const mediaElement = makeVideo(320, 180);
    mediaElement.style.display = 'none';

    const { state, cleanup } = setupObservePlayerSize({ mediaElement }, CSS_PIXELS);

    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBeUndefined());

    cleanup();
  });

  it('clears the measurement when the media element is detached', async () => {
    const mediaElement = makeVideo(320, 180);

    const { state, context, cleanup } = setupObservePlayerSize({ mediaElement }, CSS_PIXELS);

    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBe(320 * 180));

    context.mediaElement.set(undefined);

    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBeUndefined());

    cleanup();
  });

  it('stops measuring the previous element when it is replaced', async () => {
    const first = makeVideo(320, 180);
    const second = makeVideo(640, 360);

    const { state, context, cleanup } = setupObservePlayerSize({ mediaElement: first }, CSS_PIXELS);

    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBe(320 * 180));

    context.mediaElement.set(second);
    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBe(640 * 360));

    first.style.width = '1920px';
    first.style.height = '1080px';
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.playerPixelArea.get()).toBe(640 * 360);

    cleanup();
  });

  it('scales by devicePixelRatio squared by default', async () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const mediaElement = makeVideo(320, 180);

    const { state, cleanup } = setupObservePlayerSize({ mediaElement });

    // Both axes scale, so the area scales by dpr².
    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBe(320 * 2 * (180 * 2)));

    cleanup();
  });

  it('ignores devicePixelRatio when useDevicePixelRatio is false', async () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const mediaElement = makeVideo(320, 180);

    const { state, cleanup } = setupObservePlayerSize({ mediaElement }, CSS_PIXELS);

    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBe(320 * 180));

    cleanup();
  });

  it('never measures when the cap is disabled', async () => {
    const mediaElement = makeVideo(320, 180);

    const { state, cleanup } = setupObservePlayerSize({ mediaElement }, { playerSizeCap: { enabled: false } });

    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.playerPixelArea.get()).toBeUndefined();

    cleanup();
  });

  it('stops observing on cleanup', async () => {
    const mediaElement = makeVideo(320, 180);

    const { state, cleanup } = setupObservePlayerSize({ mediaElement }, CSS_PIXELS);

    await vi.waitFor(() => expect(state.playerPixelArea.get()).toBe(320 * 180));

    cleanup();

    mediaElement.style.width = '1280px';
    mediaElement.style.height = '720px';
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(state.playerPixelArea.get()).toBe(320 * 180);
  });
});
