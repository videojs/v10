import { describe, expect, it, vi } from 'vitest';
import { createEventStream } from '../../../core/events/create-event-stream';
import type { PresentationAction } from '../../../core/features/resolve-presentation';
import { createState } from '../../../core/state/create-state';
import type { PlaybackEngineAction } from '../../playback-engine';
import { type ForwardPlayOwners, forwardPlayEvent } from '../forward-play-event';

describe('forwardPlayEvent', () => {
  it('dispatches play action when mediaElement fires play event', async () => {
    const mediaElement = document.createElement('video');
    const owners = createState<ForwardPlayOwners>({ mediaElement });
    const events = createEventStream<PlaybackEngineAction>();

    const dispatched: PlaybackEngineAction[] = [];
    events.subscribe((action) => dispatched.push(action));

    const cleanup = forwardPlayEvent({ owners, events });

    mediaElement.dispatchEvent(new Event('play'));

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(dispatched).toContainEqual({ type: 'play' });

    cleanup();
  });

  it('does nothing when no mediaElement', async () => {
    const owners = createState<ForwardPlayOwners>({});
    const events = createEventStream<PlaybackEngineAction>();

    const dispatched: PlaybackEngineAction[] = [];
    events.subscribe((action) => dispatched.push(action));

    const cleanup = forwardPlayEvent({ owners, events });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(dispatched).toHaveLength(0);

    cleanup();
  });

  it('starts forwarding when mediaElement is added later', async () => {
    const owners = createState<ForwardPlayOwners>({});
    const events = createEventStream<PlaybackEngineAction>();

    const dispatched: PlaybackEngineAction[] = [];
    events.subscribe((action) => dispatched.push(action));

    const cleanup = forwardPlayEvent({ owners, events });

    const mediaElement = document.createElement('video');
    owners.patch({ mediaElement });

    // Let the microtask flush run so the listener gets attached
    await Promise.resolve();

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(dispatched).toContainEqual({ type: 'play' });

    cleanup();
  });

  it('does not re-attach listener on unrelated owner changes', async () => {
    const mediaElement = document.createElement('video');
    const addEventListenerSpy = vi.spyOn(mediaElement, 'addEventListener');

    const owners = createState<ForwardPlayOwners & { videoBuffer?: unknown }>({ mediaElement });
    const events = createEventStream<PlaybackEngineAction>();

    const cleanup = forwardPlayEvent({ owners, events });

    const callsBefore = addEventListenerSpy.mock.calls.length;
    owners.patch({ videoBuffer: {} });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(addEventListenerSpy.mock.calls.length).toBe(callsBefore);

    cleanup();
  });

  it('stops forwarding after cleanup', async () => {
    const mediaElement = document.createElement('video');
    const owners = createState<ForwardPlayOwners>({ mediaElement });
    const events = createEventStream<PlaybackEngineAction>();

    const dispatched: PlaybackEngineAction[] = [];
    events.subscribe((action) => dispatched.push(action));

    const cleanup = forwardPlayEvent({ owners, events });
    cleanup();

    mediaElement.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(dispatched).toHaveLength(0);
  });

  it('stops listening to old mediaElement when replaced', async () => {
    const element1 = document.createElement('video');
    const element2 = document.createElement('video');
    const owners = createState<ForwardPlayOwners>({ mediaElement: element1 });
    const events = createEventStream<PlaybackEngineAction>();

    const dispatched: PlaybackEngineAction[] = [];
    events.subscribe((action) => dispatched.push(action));

    const cleanup = forwardPlayEvent({ owners, events });

    owners.patch({ mediaElement: element2 });
    await new Promise((resolve) => setTimeout(resolve, 10));
    dispatched.length = 0; // clear init dispatches

    // Old element should no longer forward
    element1.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(dispatched).toHaveLength(0);

    // New element should forward
    element2.dispatchEvent(new Event('play'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(dispatched).toContainEqual({ type: 'play' });

    cleanup();
  });
});
