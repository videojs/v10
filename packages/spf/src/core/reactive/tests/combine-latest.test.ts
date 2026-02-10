import { describe, expect, it, vi } from 'vitest';
import { createEventStream } from '../../events/create-event-stream';
import { createState } from '../../state/create-state';
import { combineLatest } from '../combine-latest';

describe('combineLatest', () => {
  it('combines state and event stream', () => {
    const state = createState({ count: 0 });
    const events = createEventStream<{ type: 'increment' }>();

    const combined = combineLatest([state, events]);

    expect(combined).toBeDefined();
    expect(typeof combined.subscribe).toBe('function');
  });

  it('emits after all sources have emitted', () => {
    const state = createState({ count: 0 });
    const events = createEventStream();
    const listener = vi.fn();

    const combined = combineLatest([state, events]);
    combined.subscribe(listener);
    listener.mockClear(); // Clear initial call

    // Both have emitted (state immediately, waiting for event)
    events.dispatch({ type: 'test' });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith([{ count: 0 }, { type: 'test' }]);
  });

  it('emits when state changes', () => {
    const state = createState({ count: 0 });
    const events = createEventStream();
    const listener = vi.fn();

    const combined = combineLatest([state, events]);
    combined.subscribe(listener);
    listener.mockClear();

    // Trigger initial event emission
    events.dispatch({ type: 'init' });
    listener.mockClear();

    // Change state
    state.patch({ count: 1 });
    state.flush();

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith([{ count: 1 }, { type: 'init' }]);
  });

  it('emits when event is dispatched', () => {
    const state = createState({ count: 5 });
    const events = createEventStream<{ type: string; value: number }>();
    const listener = vi.fn();

    const combined = combineLatest([state, events]);
    combined.subscribe(listener);
    listener.mockClear();

    // Trigger initial event
    events.dispatch({ type: 'first', value: 1 });
    listener.mockClear();

    // Dispatch another event
    events.dispatch({ type: 'second', value: 2 });

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith([{ count: 5 }, { type: 'second', value: 2 }]);
  });

  it('emits latest values from all sources', () => {
    const state = createState({ count: 0 });
    const events = createEventStream();
    const listener = vi.fn();

    const combined = combineLatest([state, events]);
    combined.subscribe(listener);
    listener.mockClear();

    // Initial event
    events.dispatch({ type: 'first' });
    listener.mockClear();

    // Update state
    state.patch({ count: 1 });
    state.flush();

    // Latest from both: count=1, type='first'
    expect(listener).toHaveBeenCalledWith([{ count: 1 }, { type: 'first' }]);

    listener.mockClear();

    // Dispatch new event
    events.dispatch({ type: 'second' });

    // Latest from both: count=1 (unchanged), type='second'
    expect(listener).toHaveBeenCalledWith([{ count: 1 }, { type: 'second' }]);
  });

  it('returns unsubscribe function', () => {
    const state = createState({ count: 0 });
    const events = createEventStream();
    const listener = vi.fn();

    const combined = combineLatest([state, events]);
    const unsubscribe = combined.subscribe(listener);

    expect(typeof unsubscribe).toBe('function');

    unsubscribe();
    listener.mockClear();

    state.patch({ count: 1 });
    state.flush();

    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribes from all inner sources', () => {
    const state = createState({ count: 0 });
    const events = createEventStream();
    const listener = vi.fn();

    const combined = combineLatest([state, events]);
    const unsubscribe = combined.subscribe(listener);

    unsubscribe();
    listener.mockClear();

    // Neither should trigger
    state.patch({ count: 1 });
    state.flush();
    events.dispatch({ type: 'test' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('supports multiple subscribers', () => {
    const state = createState({ count: 0 });
    const events = createEventStream();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    const combined = combineLatest([state, events]);
    combined.subscribe(listener1);
    combined.subscribe(listener2);

    listener1.mockClear();
    listener2.mockClear();

    events.dispatch({ type: 'test' });

    expect(listener1).toHaveBeenCalledOnce();
    expect(listener2).toHaveBeenCalledOnce();
  });

  it('combines three sources', () => {
    const state = createState({ count: 0 });
    const events = createEventStream();
    const owners = createState({ element: null as object | null });

    const listener = vi.fn();

    const combined = combineLatest([state, events, owners]);
    combined.subscribe(listener);
    listener.mockClear();

    // Trigger emissions from all sources
    events.dispatch({ type: 'init' });
    listener.mockClear();

    state.patch({ count: 1 });
    state.flush();

    expect(listener).toHaveBeenCalledWith([{ count: 1 }, { type: 'init' }, { element: null }]);
  });
});
