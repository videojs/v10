import { describe, expect, it, vi } from 'vitest';
import { createEventStream, isEventStream } from '../create-event-stream';

describe('createEventStream', () => {
  it('creates an event stream', () => {
    const stream = createEventStream();

    expect(stream).toBeDefined();
    expect(typeof stream.dispatch).toBe('function');
    expect(typeof stream.subscribe).toBe('function');
  });

  it('notifies subscribers when event is dispatched', () => {
    const stream = createEventStream<{ type: string; value: number }>();
    const listener = vi.fn();

    stream.subscribe(listener);
    stream.dispatch({ type: 'test', value: 42 });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ type: 'test', value: 42 });
  });

  it('notifies subscribers synchronously', () => {
    const stream = createEventStream();
    let called = false;

    stream.subscribe(() => {
      called = true;
    });

    stream.dispatch({ type: 'test' });

    // Should be called immediately (synchronous)
    expect(called).toBe(true);
  });

  it('notifies all subscribers', () => {
    const stream = createEventStream();
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    const listener3 = vi.fn();

    stream.subscribe(listener1);
    stream.subscribe(listener2);
    stream.subscribe(listener3);

    stream.dispatch({ type: 'test' });

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
    expect(listener3).toHaveBeenCalledOnce();
  });

  it('returns unsubscribe function', () => {
    const stream = createEventStream();
    const listener = vi.fn();

    const unsubscribe = stream.subscribe(listener);

    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
    stream.dispatch({ type: 'test' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('handles multiple dispatches', () => {
    const stream = createEventStream<{ type: string; count: number }>();
    const listener = vi.fn();

    stream.subscribe(listener);

    stream.dispatch({ type: 'first', count: 1 });
    stream.dispatch({ type: 'second', count: 2 });
    stream.dispatch({ type: 'third', count: 3 });

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenNthCalledWith(1, { type: 'first', count: 1 });
    expect(listener).toHaveBeenNthCalledWith(2, { type: 'second', count: 2 });
    expect(listener).toHaveBeenNthCalledWith(3, { type: 'third', count: 3 });
  });

  it('allows unsubscribing during dispatch', () => {
    const stream = createEventStream();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    stream.subscribe(listener1);
    const unsubscribe2 = stream.subscribe(listener2);

    stream.subscribe(() => {
      unsubscribe2(); // Unsubscribe during dispatch
    });

    stream.dispatch({ type: 'test' });

    // Listener2 should still be called (was subscribed when dispatch started)
    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();

    // But not on next dispatch
    stream.dispatch({ type: 'test2' });
    expect(listener1).toHaveBeenCalledTimes(2);
    expect(listener2).toHaveBeenCalledOnce();
  });

  it('handles subscription during dispatch', () => {
    const stream = createEventStream();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    stream.subscribe(listener1);
    stream.subscribe(() => {
      // Subscribe during dispatch
      stream.subscribe(listener2);
    });

    stream.dispatch({ type: 'test' });

    expect(listener1).toHaveBeenCalledOnce();
    // Listener2 was added during dispatch, should not be called this time
    expect(listener2).not.toHaveBeenCalled();

    // But should be called on next dispatch
    stream.dispatch({ type: 'test2' });
    expect(listener2).toHaveBeenCalledOnce();
  });

  it('handles same listener subscribed multiple times', () => {
    const stream = createEventStream();
    const listener = vi.fn();

    stream.subscribe(listener);
    stream.subscribe(listener);
    stream.subscribe(listener);

    stream.dispatch({ type: 'test' });

    // Set semantics: listener only called once
    expect(listener).toHaveBeenCalledOnce();
  });

  it('safely handles unsubscribe called multiple times', () => {
    const stream = createEventStream();
    const listener = vi.fn();

    const unsubscribe = stream.subscribe(listener);

    unsubscribe();
    unsubscribe(); // Should not throw

    stream.dispatch({ type: 'test' });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('isEventStream', () => {
  it('identifies event stream', () => {
    const stream = createEventStream();

    expect(isEventStream(stream)).toBe(true);
  });

  it('rejects non-stream objects', () => {
    expect(isEventStream({})).toBe(false);
    expect(isEventStream(null)).toBe(false);
    expect(isEventStream(undefined)).toBe(false);
    expect(isEventStream(42)).toBe(false);
    expect(isEventStream('stream')).toBe(false);
  });

  it('rejects objects without symbol', () => {
    const fake = {
      dispatch: () => {},
      subscribe: () => () => {},
    };

    expect(isEventStream(fake)).toBe(false);
  });
});
