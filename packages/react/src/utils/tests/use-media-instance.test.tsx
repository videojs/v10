import { act, cleanup, render, renderHook } from '@testing-library/react';
import type { Media } from '@videojs/media';
import { Component, type ErrorInfo, type ReactNode, type RefCallback, StrictMode, Suspense, useEffect } from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { createPlayerWrapper } from '../../testing/mocks';
import { useAttachMedia } from '../use-attach-media';
import { useComposedRefs } from '../use-composed-refs';
import { useMediaInstance } from '../use-media-instance';

class TestMedia extends EventTarget {
  static instances: TestMedia[] = [];

  readonly engine = null;
  readonly destroy = vi.fn();

  constructor() {
    super();
    TestMedia.instances.push(this);
  }
}

const TestMediaClass = TestMedia as unknown as new () => TestMedia & Media;

interface AttachedTestMedia {
  readonly engine: null;
  readonly destroyed: boolean;
  attach(target: HTMLVideoElement): void;
  detach(): void;
  destroy(): void;
}

function createAttachedTestMediaClass(label: string, events: string[]): new () => AttachedTestMedia & Media {
  return class extends EventTarget {
    readonly engine = null;
    destroyed = false;

    attach(_target: HTMLVideoElement) {
      if (this.destroyed) throw new Error(`${label} attached after destroy`);
      events.push(`${label}:attach`);
    }

    detach() {
      if (this.destroyed) throw new Error(`${label} detached after destroy`);
      events.push(`${label}:detach`);
    }

    destroy() {
      events.push(`${label}:destroy`);
      this.destroyed = true;
    }
  } as unknown as new () => AttachedTestMedia & Media;
}

function AttachedHost({
  MediaClass,
  forwardedRef,
}: {
  MediaClass: new () => AttachedTestMedia & Media;
  forwardedRef?: RefCallback<HTMLVideoElement>;
}) {
  const media = useMediaInstance(MediaClass);
  const attachRef = useAttachMedia(media);
  const ref = useComposedRefs(attachRef, forwardedRef);

  return (
    <video ref={ref}>
      <track kind="captions" />
    </video>
  );
}

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(_error: Error, _info: ErrorInfo) {}

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

beforeEach(() => {
  TestMedia.instances = [];
});

afterEach(cleanup);

describe('useMediaInstance', () => {
  it('exposes an explicit nullable readiness contract', () => {
    const { result } = renderHook(() => useMediaInstance(TestMediaClass));

    expectTypeOf(result.current).toEqualTypeOf<(TestMedia & Media) | null>();
    expect(result.current).toBe(TestMedia.instances[0]);
  });

  it('does not acquire during server rendering', () => {
    function ServerComponent() {
      const media = useMediaInstance(TestMediaClass);
      return <div data-ready={media ? 'true' : 'false'} />;
    }

    expect(renderToString(<ServerComponent />)).toContain('data-ready="false"');
    expect(TestMedia.instances).toHaveLength(0);
  });

  it('does not acquire from an abandoned render', () => {
    function Abandoned(): ReactNode {
      useMediaInstance(TestMediaClass);
      throw new Error('abandon render');
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <Boundary>
        <Abandoned />
      </Boundary>
    );

    expect(TestMedia.instances).toHaveLength(0);
    consoleError.mockRestore();
  });

  it('runs setup before publishing and owns cleanup', () => {
    const events: string[] = [];
    const setup = vi.fn(() => events.push('setup'));
    const { value, Wrapper } = createPlayerWrapper();
    value.setMedia = vi.fn(() => events.push('publish'));

    const { result, unmount } = renderHook(() => useMediaInstance(TestMediaClass, setup), { wrapper: Wrapper });
    const instance = result.current!;

    expect(setup).toHaveBeenCalledOnce();
    expect(setup).toHaveBeenCalledWith(instance);
    expect(events).toEqual(['setup', 'publish']);
    expect(value.setMedia).toHaveBeenCalledWith(instance);

    unmount();

    expect(instance.destroy).toHaveBeenCalledOnce();
    const detach = vi.mocked(value.setMedia).mock.calls.at(-1)![0];
    expect(detach).toBeTypeOf('function');
    if (typeof detach === 'function') {
      expect(detach(instance)).toBeNull();
      expect(detach({} as Media)).not.toBeNull();
    }
  });

  it('acquires and publishes before passive effects', () => {
    const events: string[] = [];
    const { value, Wrapper } = createPlayerWrapper();
    value.setMedia = vi.fn(() => events.push('publish'));

    function PassiveProbe() {
      useEffect(() => {
        events.push('passive');
      }, []);

      return null;
    }

    function AcquisitionProbe() {
      const media = useMediaInstance(TestMediaClass, () => events.push('setup'));
      return <div data-ready={media ? 'true' : 'false'} />;
    }

    const { container } = render(
      <>
        <PassiveProbe />
        <AcquisitionProbe />
      </>,
      { wrapper: Wrapper }
    );

    expect(events).toEqual(['setup', 'publish', 'passive']);
    expect(container.firstElementChild?.getAttribute('data-ready')).toBe('true');
  });

  it('cleans up the old class before publishing its replacement', () => {
    class ReplacementMedia extends TestMedia {}

    const ReplacementMediaClass = ReplacementMedia as unknown as new () => ReplacementMedia & Media;
    const events: string[] = [];
    let current: Media | null = null;
    const { value, Wrapper } = createPlayerWrapper();
    value.setMedia = vi.fn((next) => {
      if (typeof next === 'function') {
        events.push('detach:old');
        current = next(current);
      } else {
        events.push(next instanceof ReplacementMedia ? 'publish:new' : 'publish:old');
        current = next;
      }
    });

    const { result, rerender } = renderHook(({ MediaClass }) => useMediaInstance(MediaClass), {
      initialProps: { MediaClass: TestMediaClass },
      wrapper: Wrapper,
    });
    const first = result.current!;
    first.destroy.mockImplementation(() => events.push('destroy:old'));
    events.length = 0;

    rerender({ MediaClass: ReplacementMediaClass });

    expect(events).toEqual(['detach:old', 'destroy:old', 'publish:new']);
    expect(current).toBe(result.current);
    expect(result.current).toBeInstanceOf(ReplacementMedia);
  });

  it('detaches its target before destroying on unmount', () => {
    const events: string[] = [];
    const MediaClass = createAttachedTestMediaClass('media', events);
    const { unmount } = render(<AttachedHost MediaClass={MediaClass} />);
    events.length = 0;

    expect(() => unmount()).not.toThrow();
    expect(events).toEqual(['media:detach', 'media:destroy']);
  });

  it('detaches before destroying a replaced class without cycling the forwarded ref', () => {
    const events: string[] = [];
    const FirstMedia = createAttachedTestMediaClass('first', events);
    const ReplacementMedia = createAttachedTestMediaClass('replacement', events);
    const forwardedRef = vi.fn<RefCallback<HTMLVideoElement>>();
    const { rerender } = render(<AttachedHost MediaClass={FirstMedia} forwardedRef={forwardedRef} />);
    events.length = 0;

    expect(() => rerender(<AttachedHost MediaClass={ReplacementMedia} forwardedRef={forwardedRef} />)).not.toThrow();
    expect(events).toEqual(['first:detach', 'first:destroy', 'replacement:attach']);
    expect(forwardedRef).toHaveBeenCalledOnce();
  });

  it('keeps a destroyed acquisition unavailable while a suspended tree reconnects', async () => {
    const events: string[] = [];
    const renders: Array<(AttachedTestMedia & Media) | null> = [];
    const MediaClass = createAttachedTestMediaClass('media', events);
    let resolveSuspension!: () => void;
    const suspension = new Promise<void>((resolve) => {
      resolveSuspension = resolve;
    });

    function Host() {
      const media = useMediaInstance(MediaClass);
      const ref = useAttachMedia(media);
      renders.push(media);
      return (
        <video ref={ref}>
          <track kind="captions" />
        </video>
      );
    }

    function Gate({ suspended }: { suspended: boolean }) {
      if (suspended) throw suspension;
      return <Host />;
    }

    function App({ suspended }: { suspended: boolean }) {
      return (
        <Suspense fallback={null}>
          <Gate suspended={suspended} />
        </Suspense>
      );
    }

    const { rerender } = render(<App suspended={false} />);
    const initial = renders.at(-1)!;
    events.length = 0;
    renders.length = 0;

    rerender(<App suspended />);

    expect(events).toEqual(['media:detach', 'media:destroy']);
    events.length = 0;

    expect(() => rerender(<App suspended={false} />)).not.toThrow();
    expect(renders).toHaveLength(2);
    expect(renders[0]).toBeNull();
    expect(renders[1]).not.toBe(initial);
    expect(renders[1]?.destroyed).toBe(false);
    expect(events).toEqual(['media:attach']);

    await act(async () => {
      resolveSuspension();
      await suspension;
    });
  });

  it('destroys an instance when setup fails before publication', () => {
    const error = new Error('setup failed');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      renderHook(() =>
        useMediaInstance(TestMediaClass, () => {
          throw error;
        })
      )
    ).toThrow(error);

    expect(TestMedia.instances).toHaveLength(1);
    expect(TestMedia.instances[0]!.destroy).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it('cleans up and reacquires during the StrictMode effect replay', () => {
    const setup = vi.fn();
    const { result, unmount } = renderHook(() => useMediaInstance(TestMediaClass, setup), {
      wrapper: StrictMode,
    });

    expect(TestMedia.instances).toHaveLength(2);
    expect(TestMedia.instances[0]!.destroy).toHaveBeenCalledOnce();
    expect(result.current).toBe(TestMedia.instances[1]);
    expect(setup).toHaveBeenCalledTimes(2);

    unmount();

    expect(TestMedia.instances[1]!.destroy).toHaveBeenCalledOnce();
  });
});
