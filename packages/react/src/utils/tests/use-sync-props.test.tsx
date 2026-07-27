import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useSyncProps } from '../use-sync-props';

afterEach(cleanup);

interface TargetProps {
  src: string;
  volume: number | undefined;
}

const defaults: TargetProps = { src: '', volume: 1 };

describe('useSyncProps', () => {
  it('writes props onto the target and returns the rest', () => {
    const target: TargetProps = { ...defaults };

    const { result } = renderHook(({ props }) => useSyncProps(target, props, defaults), {
      initialProps: { props: { src: 'video.mp4', id: 'player' } },
    });

    expect(target.src).toBe('video.mp4');
    expect(result.current).toEqual({ id: 'player' });
  });

  it('writes the default for props passed as undefined', () => {
    const target: TargetProps = { ...defaults, volume: 0.5 };

    renderHook(() => useSyncProps(target, { volume: undefined }, defaults));

    expect(target.volume).toBe(1);
  });

  it('resets props back to defaults when they are omitted on a re-render', () => {
    const target: TargetProps = { ...defaults };

    const { rerender } = renderHook(({ props }) => useSyncProps(target, props, defaults), {
      initialProps: { props: { src: 'video.mp4', volume: 0.5 } as Partial<TargetProps> },
    });

    expect(target.volume).toBe(0.5);

    rerender({ props: { src: 'video.mp4' } });

    expect(target.volume).toBe(1);
    expect(target.src).toBe('video.mp4');
  });

  it('does not touch target values that were never passed as props', () => {
    const target: TargetProps = { ...defaults, volume: 0.5 };

    const { rerender } = renderHook(({ props }) => useSyncProps(target, props, defaults), {
      initialProps: { props: { src: 'video.mp4' } as Partial<TargetProps> },
    });

    rerender({ props: { src: 'video.mp4' } });

    // `volume` was set outside of props; omitting it from props never resets it.
    expect(target.volume).toBe(0.5);
  });
});
