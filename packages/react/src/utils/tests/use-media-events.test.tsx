import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { useMediaEvents } from '../use-media-events';

afterEach(cleanup);

describe('useMediaEvents', () => {
  it('calls media event handlers when the adapter dispatches the event', () => {
    const media = new EventTarget();
    const onPlay = vi.fn((event: Event) => event.currentTarget);
    const onTimeUpdate = vi.fn();

    renderHook(() => useMediaEvents(media, { onPlay, onTimeUpdate }));

    media.dispatchEvent(new Event('play'));
    media.dispatchEvent(new Event('timeupdate'));
    media.dispatchEvent(new Event('pause'));

    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onTimeUpdate).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveReturnedWith(media);
  });

  it('strips media event props and returns the rest', () => {
    const media = new EventTarget();

    const { result } = renderHook(() =>
      useMediaEvents(media, { onPlay: vi.fn(), onError: vi.fn(), id: 'player', onLoad: vi.fn() })
    );

    expect(Object.keys(result.current)).toEqual(['id', 'onLoad']);
  });

  it('calls the latest handler without resubscribing', () => {
    const media = new EventTarget();
    const first = vi.fn();
    const second = vi.fn();
    const addEventListener = vi.spyOn(media, 'addEventListener');

    const { rerender } = renderHook(({ onPause }) => useMediaEvents(media, { onPause }), {
      initialProps: { onPause: first as (() => void) | undefined },
    });
    const subscriptions = addEventListener.mock.calls.length;

    rerender({ onPause: second });
    media.dispatchEvent(new Event('pause'));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(addEventListener).toHaveBeenCalledTimes(subscriptions);
  });

  it('ignores events once a handler is removed', () => {
    const media = new EventTarget();
    const onEnded = vi.fn();

    const { rerender } = renderHook(({ onEnded }) => useMediaEvents(media, { onEnded }), {
      initialProps: { onEnded: onEnded as (() => void) | undefined },
    });

    rerender({ onEnded: undefined });
    media.dispatchEvent(new Event('ended'));

    expect(onEnded).not.toHaveBeenCalled();
  });

  it('unsubscribes from the adapter on unmount', () => {
    const media = new EventTarget();
    const onPlay = vi.fn();

    const { unmount } = renderHook(() => useMediaEvents(media, { onPlay }));

    unmount();
    media.dispatchEvent(new Event('play'));

    expect(onPlay).not.toHaveBeenCalled();
  });
});
