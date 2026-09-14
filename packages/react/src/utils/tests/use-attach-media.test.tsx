import { cleanup, render } from '@testing-library/react';
import type { EngineAdapter } from '@videojs/media';
import { StrictMode, useCallback, useEffect } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { useAttachMedia } from '../use-attach-media';
import { useComposedRefs } from '../use-composed-refs';

function createMedia() {
  return { engine: null, attach: vi.fn(), detach: vi.fn(), destroy: vi.fn() } satisfies EngineAdapter;
}

type Media = ReturnType<typeof createMedia>;

/**
 * The shape every media adapter has: the attach ref composed ahead of whatever ref the parent passes, so the parent
 * controls the composed callback's identity on each render.
 */
function TestComponent({
  media,
  forwardedRef,
  elementKey,
}: {
  media: Media;
  forwardedRef?: (node: HTMLVideoElement | null) => void;
  elementKey?: string;
}) {
  const attachRef = useAttachMedia<HTMLVideoElement>(media);
  const composedRef = useComposedRefs(attachRef, forwardedRef);

  return <video key={elementKey} ref={composedRef} />;
}

describe('useAttachMedia', () => {
  afterEach(cleanup);

  it('attaches the element on mount and detaches it on unmount', () => {
    const media = createMedia();

    const { container, unmount } = render(<TestComponent media={media} />);

    expect(media.attach).toHaveBeenCalledTimes(1);
    expect(media.attach).toHaveBeenCalledWith(container.querySelector('video'));
    expect(media.detach).not.toHaveBeenCalled();

    unmount();

    expect(media.detach).toHaveBeenCalledTimes(1);
  });

  it('does not detach and re-attach when the composed ref changes identity', () => {
    const media = createMedia();

    const { rerender } = render(<TestComponent media={media} forwardedRef={() => {}} />);

    // A new inline ref every render, which React allows and many parents do.
    rerender(<TestComponent media={media} forwardedRef={() => {}} />);
    rerender(<TestComponent media={media} forwardedRef={() => {}} />);

    expect(media.detach).not.toHaveBeenCalled();
    expect(media.attach).toHaveBeenCalledTimes(1);
  });

  it('attaches while the refs run, before the effects of the mounting commit', () => {
    const media = createMedia();
    const attachedWhenEffectRan: number[] = [];

    function Effects() {
      const attachRef = useAttachMedia<HTMLVideoElement>(media);

      useEffect(() => {
        attachedWhenEffectRan.push(media.attach.mock.calls.length);
      }, []);

      return <video ref={attachRef} />;
    }

    render(<Effects />);

    expect(attachedWhenEffectRan).toEqual([1]);
  });

  it('runs the refs composed ahead of it before attaching', () => {
    const media = createMedia();
    const attachedWhenRefRan: boolean[] = [];

    function Ordered() {
      const attachRef = useAttachMedia<HTMLVideoElement>(media);
      // Listeners bound from a ref, the way `useMediaEvents` does, must see the element before it is attached.
      const listenersRef = useCallback((node: HTMLVideoElement | null) => {
        if (node) attachedWhenRefRan.push(media.attach.mock.calls.length > 0);
      }, []);
      const composedRef = useComposedRefs(listenersRef, attachRef);

      return <video ref={composedRef} />;
    }

    render(<Ordered />);

    expect(attachedWhenRefRan).toEqual([false]);
    expect(media.attach).toHaveBeenCalledTimes(1);
  });

  it('moves the attachment when the element changes', () => {
    const media = createMedia();

    const { container, rerender } = render(<TestComponent media={media} elementKey="a" />);

    rerender(<TestComponent media={media} elementKey="b" />);

    expect(media.detach).toHaveBeenCalledTimes(1);
    expect(media.attach).toHaveBeenCalledTimes(2);
    expect(media.attach).toHaveBeenLastCalledWith(container.querySelector('video'));
    // hls.js clears the element on detach, so the old element must be released before the new one is attached.
    expect(media.detach.mock.invocationCallOrder[0]).toBeLessThan(media.attach.mock.invocationCallOrder[1]!);
  });

  it('detaches when the element goes away while the component stays mounted', () => {
    const media = createMedia();

    function Conditional({ show }: { show: boolean }) {
      const attachRef = useAttachMedia<HTMLVideoElement>(media);

      return show ? <video ref={attachRef} /> : <p>Loading</p>;
    }

    const { container, rerender } = render(<Conditional show />);

    rerender(<Conditional show={false} />);

    expect(media.detach).toHaveBeenCalledTimes(1);

    rerender(<Conditional show />);

    expect(media.attach).toHaveBeenCalledTimes(2);
    expect(media.attach).toHaveBeenLastCalledWith(container.querySelector('video'));
  });

  it('moves the attachment when the adapter changes', () => {
    const before = createMedia();
    const after = createMedia();

    const { container, rerender } = render(<TestComponent media={before} />);

    rerender(<TestComponent media={after} />);

    expect(before.detach).toHaveBeenCalledTimes(1);
    expect(before.attach).toHaveBeenCalledTimes(1);
    expect(after.attach).toHaveBeenCalledTimes(1);
    expect(after.attach).toHaveBeenCalledWith(container.querySelector('video'));
    expect(after.detach).not.toHaveBeenCalled();
    expect(before.detach.mock.invocationCallOrder[0]).toBeLessThan(after.attach.mock.invocationCallOrder[0]!);
  });

  it('leaves nothing attached when the adapter fails to attach', () => {
    const media = createMedia();

    media.attach.mockImplementation(() => {
      throw new Error('attach failed');
    });

    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      expect(() => render(<TestComponent media={media} />)).toThrow();
    } finally {
      error.mockRestore();
    }

    expect(media.detach).not.toHaveBeenCalled();
  });

  it('stays attached after StrictMode double invocation and across later renders', () => {
    const media = createMedia();

    const { rerender, unmount } = render(
      <StrictMode>
        <TestComponent media={media} forwardedRef={() => {}} />
      </StrictMode>
    );

    expect(media.attach.mock.calls.length - media.detach.mock.calls.length).toBe(1);

    const attaches = media.attach.mock.calls.length;
    const detaches = media.detach.mock.calls.length;

    rerender(
      <StrictMode>
        <TestComponent media={media} forwardedRef={() => {}} />
      </StrictMode>
    );

    expect(media.attach).toHaveBeenCalledTimes(attaches);
    expect(media.detach).toHaveBeenCalledTimes(detaches);

    unmount();

    expect(media.detach).toHaveBeenCalledTimes(detaches + 1);
  });
});
