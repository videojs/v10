import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vite-plus/test';

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
    // Mirrors MuxVideoAdapter: setting `source` derives `src`, resetting `src` clears `source`.
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
  /** A target whose setter records every write, so a skipped write is observable. */
  function writeSpy<T>(initial: T) {
    const writes: T[] = [];
    const target = {
      _value: initial,
      get value() {
        return this._value;
      },
      set value(next: T) {
        writes.push(next);
        this._value = next;
      },
    };

    return { target: target as unknown as { value: T }, writes };
  }

  const valueDefaults = { value: null as unknown };

  it('does not rewrite an object prop that is structurally unchanged', () => {
    const { target, writes } = writeSpy<unknown>(null);

    // What React produces for `source={{ src, type }}`: a fresh object every render.
    const { rerender } = renderHook(() =>
      useSyncProps(target, { value: { src: 'a.m3u8', type: 'application/x-mpegurl' } }, valueDefaults)
    );

    expect(writes).toHaveLength(1);

    rerender();
    rerender();
    rerender();

    expect(writes).toHaveLength(1);
  });

  it('writes an object prop whose contents actually changed', () => {
    const { target, writes } = writeSpy<unknown>(null);
    let src = 'a.m3u8';

    const { rerender } = renderHook(() => useSyncProps(target, { value: { src } }, valueDefaults));

    expect(writes).toHaveLength(1);

    src = 'b.m3u8';
    rerender();

    expect(writes).toEqual([{ src: 'a.m3u8' }, { src: 'b.m3u8' }]);
  });

  it('writes a primitive prop only when its value changed', () => {
    const { target, writes } = writeSpy<unknown>(null);
    let volume = 0.5;

    const { rerender } = renderHook(() => useSyncProps(target, { value: volume }, valueDefaults));

    rerender();
    expect(writes).toEqual([0.5]);

    volume = 0.8;
    rerender();

    expect(writes).toEqual([0.5, 0.8]);
  });

  it('treats null and a structurally empty object as different', () => {
    const { target, writes } = writeSpy<unknown>(null);
    let value: unknown = {};

    const { rerender } = renderHook(() => useSyncProps(target, { value }, valueDefaults));

    expect(writes).toEqual([{}]);

    value = null;
    rerender();

    expect(writes).toEqual([{}, null]);
  });

  it('compares array props by contents', () => {
    const { target, writes } = writeSpy<unknown>(null);
    let items = ['a', 'b'];

    const { rerender } = renderHook(() => useSyncProps(target, { value: items }, valueDefaults));

    items = ['a', 'b'];
    rerender();
    expect(writes).toHaveLength(1);

    items = ['a', 'c'];
    rerender();

    expect(writes).toEqual([
      ['a', 'b'],
      ['a', 'c'],
    ]);
  });

  it('keeps a prop carrying a callback held across renders', () => {
    const { target, writes } = writeSpy<unknown>(null);
    const onReady = () => {};

    const { rerender } = renderHook(() => useSyncProps(target, { value: { src: 'a.m3u8', onReady } }, valueDefaults));

    rerender();

    // The reference is stable, so the object is unchanged even though it carries a function.
    expect(writes).toHaveLength(1);
  });

  it('writes a prop whose callback is rebuilt each render', () => {
    const { target, writes } = writeSpy<unknown>(null);

    const { rerender } = renderHook(() =>
      useSyncProps(target, { value: { src: 'a.m3u8', onReady: () => {} } }, valueDefaults)
    );

    rerender();

    // A fresh inline function is a genuinely different value, and nothing here can know it behaves the same.
    expect(writes).toHaveLength(2);
  });

  it('survives a self-referential prop instead of taking the render down', () => {
    const { target, writes } = writeSpy<unknown>(null);

    const makeCyclic = () => {
      const node: Record<string, unknown> = { src: 'a.m3u8' };

      node.self = node;

      return node;
    };

    // Two structurally identical cyclic objects have no finite comparison; the render must still complete.
    expect(() =>
      renderHook(() => useSyncProps(target, { value: makeCyclic() }, valueDefaults)).rerender()
    ).not.toThrow();

    expect(writes.length).toBeGreaterThan(0);
  });
});
