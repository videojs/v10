import { describe, expect, it, vi } from 'vitest';
import type { ContextSignals, StateSignals } from '../../../../core/composition/create-composition';
import { signal } from '../../../../core/signals/primitives';
import { type LoadTriggersContext, type LoadTriggersState, trackLoadTriggers } from '../track-load-triggers';

function makeState(initial: LoadTriggersState = {}): StateSignals<LoadTriggersState> {
  return {
    loadActivated: signal<boolean | undefined>(initial.loadActivated),
    presentation: signal<LoadTriggersState['presentation']>(initial.presentation),
  };
}

function makeContext(initial: LoadTriggersContext = {}): ContextSignals<LoadTriggersContext> {
  return { mediaElement: signal<HTMLMediaElement | undefined>(initial.mediaElement) };
}

function setupTrackLoadTriggers(initialState: LoadTriggersState = {}, initialContext: LoadTriggersContext = {}) {
  const state = makeState(initialState);
  const context = makeContext(initialContext);
  const reactor = trackLoadTriggers.setup({ state, context });
  return { state, context, reactor };
}

/** Creates a video element with controllable `paused` and `seeking` state. */
function makeMediaElement({ paused = true, seeking = false }: { paused?: boolean; seeking?: boolean } = {}) {
  const el = document.createElement('video');
  let pausedFlag = paused;
  let seekingFlag = seeking;
  Object.defineProperty(el, 'paused', { get: () => pausedFlag, configurable: true });
  Object.defineProperty(el, 'seeking', { get: () => seekingFlag, configurable: true });
  return {
    el,
    play() {
      pausedFlag = false;
      el.dispatchEvent(new Event('play'));
    },
    pause() {
      pausedFlag = true;
    },
    seek() {
      seekingFlag = true;
      el.dispatchEvent(new Event('seeking'));
    },
    endSeek() {
      seekingFlag = false;
    },
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 10));

describe('trackLoadTriggers', () => {
  it('sets loadActivated to true when mediaElement fires play event', async () => {
    const { el, play } = makeMediaElement();
    const { state, reactor } = setupTrackLoadTriggers(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    play();
    await flush();

    expect(state.loadActivated.get()).toBe(true);
    reactor.destroy();
  });

  it('sets loadActivated to true when mediaElement fires seeking event', async () => {
    const { el, seek } = makeMediaElement();
    const { state, reactor } = setupTrackLoadTriggers(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    seek();
    await flush();

    expect(state.loadActivated.get()).toBe(true);
    reactor.destroy();
  });

  it('sets loadActivated to true immediately if element is already playing on entry', async () => {
    const { el } = makeMediaElement({ paused: false });
    const { state, reactor } = setupTrackLoadTriggers(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    await flush();

    expect(state.loadActivated.get()).toBe(true);
    reactor.destroy();
  });

  it('sets loadActivated to true immediately if element is mid-seek on entry', async () => {
    const { el } = makeMediaElement({ paused: true, seeking: true });
    const { state, reactor } = setupTrackLoadTriggers(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    await flush();

    expect(state.loadActivated.get()).toBe(true);
    reactor.destroy();
  });

  it('preserves pre-existing true write (adapter wrote before setup)', async () => {
    const { el } = makeMediaElement();
    const addEventListenerSpy = vi.spyOn(el, 'addEventListener');
    const { state, reactor } = setupTrackLoadTriggers(
      { loadActivated: true, presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    await flush();

    expect(state.loadActivated.get()).toBe(true);
    // Listeners not attached when slot is pre-set
    expect(addEventListenerSpy.mock.calls.some(([type]) => type === 'play' || type === 'seeking')).toBe(false);
    reactor.destroy();
  });

  it('stays true on subsequent pause/play cycles within the same source', async () => {
    const { el, play, pause } = makeMediaElement();
    const { state, reactor } = setupTrackLoadTriggers(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    play();
    await flush();
    expect(state.loadActivated.get()).toBe(true);

    pause();
    await flush();
    expect(state.loadActivated.get()).toBe(true);

    play();
    await flush();
    expect(state.loadActivated.get()).toBe(true);

    reactor.destroy();
  });

  it('resets loadActivated to false when presentation URL changes', async () => {
    const { el, play, pause } = makeMediaElement();
    const { state, reactor } = setupTrackLoadTriggers(
      { presentation: { url: 'http://example.com/stream1.m3u8' } },
      { mediaElement: el }
    );

    play();
    await flush();
    expect(state.loadActivated.get()).toBe(true);

    // Engine convention: URL transitions through undefined on src swap
    pause();
    state.presentation.set(undefined);
    await flush();
    expect(state.loadActivated.get()).toBe(false);

    state.presentation.set({ url: 'http://example.com/stream2.m3u8' });
    await flush();
    expect(state.loadActivated.get()).toBe(false);

    reactor.destroy();
  });

  it('resets loadActivated to false when the media element is swapped through undefined', async () => {
    const { el, play } = makeMediaElement();
    const { state, context, reactor } = setupTrackLoadTriggers(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    play();
    await flush();
    expect(state.loadActivated.get()).toBe(true);

    // Engine convention: source swaps destroy + recreate; element signal
    // passes through undefined so the state machine exits the positive state.
    context.mediaElement.set(undefined);
    await flush();
    expect(state.loadActivated.get()).toBe(false);

    context.mediaElement.set(document.createElement('video'));
    await flush();
    expect(state.loadActivated.get()).toBe(false);

    reactor.destroy();
  });

  it('resets loadActivated to false when element is removed', async () => {
    const { el, play } = makeMediaElement();
    const { state, context, reactor } = setupTrackLoadTriggers(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    play();
    await flush();
    expect(state.loadActivated.get()).toBe(true);

    context.mediaElement.set(undefined);
    await flush();

    expect(state.loadActivated.get()).toBe(false);
    reactor.destroy();
  });

  it('resets loadActivated to false when URL is cleared', async () => {
    const { el, play } = makeMediaElement();
    const { state, reactor } = setupTrackLoadTriggers(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    play();
    await flush();
    expect(state.loadActivated.get()).toBe(true);

    state.presentation.set(undefined);
    await flush();

    expect(state.loadActivated.get()).toBe(false);
    reactor.destroy();
  });

  it('does not re-attach listener on unrelated context changes', async () => {
    const { el } = makeMediaElement();
    const addEventListenerSpy = vi.spyOn(el, 'addEventListener');

    const state = makeState({ presentation: { url: 'http://example.com/stream.m3u8' } });
    const context: ContextSignals<LoadTriggersContext> & { videoBuffer: ReturnType<typeof signal<unknown>> } = {
      mediaElement: signal<HTMLMediaElement | undefined>(el),
      videoBuffer: signal<unknown>(undefined),
    };
    const reactor = trackLoadTriggers.setup({ state, context });

    await flush();
    const callsBefore = addEventListenerSpy.mock.calls.length;

    context.videoBuffer.set({});
    await flush();

    expect(addEventListenerSpy.mock.calls.length).toBe(callsBefore);
    reactor.destroy();
  });

  it('stops tracking after destroy', async () => {
    const { el, play } = makeMediaElement();
    const { state, reactor } = setupTrackLoadTriggers(
      { presentation: { url: 'http://example.com/stream1.m3u8' } },
      { mediaElement: el }
    );

    reactor.destroy();

    play();
    await flush();

    expect(state.loadActivated.get()).toBeFalsy();
  });

  it('resets loadActivated to false on destroy when slot was true', async () => {
    const { el, play } = makeMediaElement();
    const { state, reactor } = setupTrackLoadTriggers(
      { presentation: { url: 'http://example.com/stream.m3u8' } },
      { mediaElement: el }
    );

    play();
    await flush();
    expect(state.loadActivated.get()).toBe(true);

    reactor.destroy();
    expect(state.loadActivated.get()).toBe(false);
  });
});
