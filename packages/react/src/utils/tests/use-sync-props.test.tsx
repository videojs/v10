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

  it('resets props back to defaults when they change to undefined on a re-render', () => {
    const target: TargetProps = { ...defaults };

    const { rerender } = renderHook(({ props }) => useSyncProps(target, props, defaults), {
      initialProps: { props: { volume: 0.5 } as Partial<TargetProps> },
    });

    expect(target.volume).toBe(0.5);

    rerender({ props: { volume: undefined } });

    expect(target.volume).toBe(1);
  });

  it('treats undefined like an absent prop and never touches unsynced target values', () => {
    const target: TargetProps = { ...defaults, volume: 0.5 };

    renderHook(() => useSyncProps(target, { volume: undefined }, defaults));

    expect(target.volume).toBe(0.5);
  });

  it('does not let an undefined prop wipe a value derived from another prop', () => {
    // Mirrors MuxMedia: setting `source` derives `src`, resetting `src` clears `source`.
    const derivedDefaults: { src: string | undefined; source: { id: string } | null } = { src: '', source: null };
    const target = {
      _src: '' as string | undefined,
      _source: null as { id: string } | null,
      get src() {
        return this._src;
      },
      set src(value: string | undefined) {
        this._src = value;
        this._source = value ? { id: value } : null;
      },
      get source() {
        return this._source;
      },
      set source(value: { id: string } | null) {
        this._source = value;
        this._src = value ? value.id : '';
      },
    };

    // `source` before `src` in key order — the reset must not run after it applies.
    renderHook(() => useSyncProps(target, { source: { id: 'abc' }, src: undefined }, derivedDefaults));

    expect(target.source).toEqual({ id: 'abc' });
    expect(target.src).toBe('abc');
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
