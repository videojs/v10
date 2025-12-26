# @videojs/store

[![package-badge]][package]

> **⚠️ Alpha - SUBJECT TO CHANGE** Not recommended for production use.

A reactive store for managing state owned by external systems. Built for media players, streaming libraries, and real-time systems where you don't own the state.

```bash
npm install @videojs/store
```

## Why?

[Traditional state management](#how-its-different) assumes you own the state. But when working with a `<video>` element, Web Sockets, streaming libraries, and real-time systems, the external system is the authority. You observe it, send requests to it, and react to its changes.

`@videojs/store` embraces this model:

- **Read Path**: Observe external state, sync to reactive store
- **Write Path**: Send requests, coordinate execution, handle failures

```ts
import { createStore, createSlice } from '@videojs/store';

const store = createStore({
  slices: [playbackSlice, audioSlice],
});

store.attach(videoElement); // <video>

// State is synced
store.state.paused; // true
store.state.volume; // 1

// Requests are coordinated async operations
await store.request.play();
await store.request.setVolume(0.5);
```

## Core Concepts

### Target

The target contains a reference to an external systems. Slices read from and write to it.

```ts
const videoElement = document.querySelector('video');
store.attach(videoElement);
```

### Slices

A slice defines state, how to sync it from the target, and requests to modify the target.

```ts
// createSlice<Target>()() - curried form enables full type inference
const audioSlice = createSlice<HTMLMediaElement>()({
  initialState: { volume: 1, muted: false },

  getSnapshot: ({ target }) => ({
    volume: target.volume,
    muted: target.muted,
  }),

  subscribe: ({ target, update, signal }) => {
    target.addEventListener('volumechange', () => update(), { signal });
  },

  request: {
    setVolume(volume, { target, meta, signal }) {
      target.volume = volume;
    },

    setMuted(muted, { target, meta, signal }) {
      target.muted = muted;
    },
  },
});
```

### Explicit Types

For shared type definitions, use `Request<Input, Output>`:

```ts
import type { Request } from '@videojs/store';
import { createSlice } from '@videojs/store';

interface AudioState {
  volume: number;
  muted: boolean;
}

interface AudioRequests {
  setVolume: Request<number>; // (volume: number) => void
  setMuted: Request<boolean>; // (muted: boolean) => void
  play: Request; // () => void
  getDuration: Request; // () => number
}

const audioSlice = createSlice<HTMLMediaElement, AudioState, AudioRequests>({
  // Types enforced from interfaces
});
```

### Requests

Requests are operations against the target. Use function shorthand for simple cases, or full config for guards and scheduling.

```ts
request: {
  // Shorthand - just the handler
  setVolume(volume, { target }) {
    target.volume = volume;
  },

  // Async shorthand
  async seek(time, { target, signal }) {
    target.currentTime = time;
    await onEvent(target, 'seeked', signal);
  },

  // Full config when needed
  play: {
    key: 'playback',
    guard: [],
    cancel: [],
    // ...
    async handler({ target, signal }) {
      target.play();
      await onEvent(target, 'play', signal);
    },
  },
}
```

Consumer API is consistent, all requests return a Promise:

```ts
await store.request.setVolume(0.5);
await store.request.play();
await store.request.seek(30);
```

### Request Metadata

Every request accepts optional metadata as the last argument.

```ts
store.request.play({ source: 'user', reason: 'play-button' });
store.request.seek(30, { source: 'user', reason: 'slider-scrub' });
store.request.pause({ source: 'system', reason: 'ad-start' });

// Infer metadata from DOM event
store.request.play(clickEvent); // MouseEvent
```

Handlers receive metadata:

```ts
async handler({ target, signal, meta }) {
  console.log(`[${meta.source}] play: ${meta.reason}`);
  // ...
}
```

## Store

The store composes slices and manages the target connection.

```ts
const store = createStore({
  slices: [playbackSlice, audioSlice],

  onSetup: ({ store, signal }) => {
    // Called when store is created
  },

  onAttach: ({ store, target, signal }) => {
    // Called when target is attached
  },

  onError: ({ error, store }) => {
    // Global error handler
  },
});
```

### Attaching a Target

```ts
const detach = store.attach(videoElement);

// State syncs from target
store.state.paused;
store.state.volume;

// Requests go to target
store.request.play();

// Detach when done
detach();
```

### Subscribing to State

```ts
// Subscribe to all state changes
const unsubscribe = store.subscribe((state) => {
  console.log('State changed:', state);
});

// Subscribe with selector
store.subscribe(
  state => state.volume,
  volume => console.log('Volume:', volume)
);
```

### Keyed Subscriptions

Subscribe to specific keys for high-frequency updates:

```ts
// Only fires when currentTime changes
store.subscribe(['currentTime'], (state) => {
  updatedTime(state.currentTime);
});

// Multiple keys
store.subscribe(['volume', 'muted'], (state) => {
  updatedVolume(state.volume, state.muted);
});
```

Slices can push partial updates to avoid full syncs:

```ts
subscribe: ({ target, update, signal }) => {
  // Partial - only update currentTime
  target.addEventListener('timeupdate', () => {
    update({ currentTime: target.currentTime });
  }, { signal });

  // Full sync
  target.addEventListener('durationchange', update, { signal });
}
```

## Request Configuration

### Keys

Requests with the same key coordinate together. Default key is the request name.

```ts
request: {
  play: {
    key: 'playback',
    handler: async ({ target }) => { ... },
  },
  pause: {
    key: 'playback',  // same key - coordinates with play
    handler: async ({ target }) => { ... },
  },
}
```

When a new request arrives with the same key:

- Queued request with that key is dropped
- Executing request with that key is aborted
- New request takes over

```ts
store.request.play(); // queued
store.request.pause(); // play dropped, pause queued
store.request.play(); // pause dropped, play queued
// only final play() executes
```

Dynamic keys for parallel execution:

```ts
request: {
  // Each call gets unique key - no coordination
  logEvent: {
    key: () => Symbol(),
    handler: (data) => analytics.log(data),
  },

  // Key based on input
  loadTrack: {
    key: (trackId) => `track-${trackId}`,
    handler: (trackId, { target }) => target.loadTrack(trackId),
  },
}
```

### Cancels

Requests can cancel other in-flight requests by key. Cancellation happens immediately when the
request is enqueued, before guards or scheduling.

```ts
request: {
  stop: {
    cancel: ['seek', 'preload'],
    handler: ({ target }) => target.pause(),
  },
}
```

### Schedule

Schedule controls _when_ a request executes. The schedule function receives a `flush` callback and
optionally returns a cancel function. Default schedule is microtask (executes at end of current tick).

```ts
import { delay } from '@videojs/store';
import { frame, idle } from '@videojs/store/dom';

request: {
  // Debounce 100ms - good for sliders
  setVolume: {
    schedule: delay(100),
    handler: (volume, { target }) => { target.media.volume = volume; },
  },

  // Sync with animation frame
  updateOverlay: {
    schedule: frame(),
    handler: () => { ... },
  },

  // Execute when browser is idle
  preloadNext: {
    schedule: idle(),
    handler: () => { ... },
  },

  // Custom schedule
  custom: {
    schedule: (flush) => {
      const id = setTimeout(flush, 200);
      return () => clearTimeout(id);  // cancel function
    },
    handler: () => { ... },
  },
}
```

### Guards

Guards gate request execution. A guard returns truthy to proceed, falsy to cancel.

```ts
import { timeout } from '@videojs/store';

request: {
  seek: {
    guard: [hasMetadata, /* ... */],
    handler: (time, { target }) => {
      target.media.currentTime = time;
    },
  },

  play: {
    guard: timeout(isTargetReady, 5000),
    handler: ({ target }) => target.media.play(),
  },
}
```

**Custom guard:**

```ts
import type { Guard } from '@videojs/store';

const canMediaPlay: Guard<HTMLMediaElement> = ({ target, signal }) => {
  if (target.readyState >= HAVE_ENOUGH_DATA) return true;
  return onEvent(target, 'canplay', signal); // wait for canplay
};
```

**Combinators:**

```ts
// All must be truthy
const canSeek = all(hasMedia, canMediaPlay, notMediaSeeking);

// First truthy wins
const ready = any(canMediaPlay, canMediaPlayThrough);

// Reject if guard doesn't resolve in time
const timedPlay = timeout(canMediaPlay, 5000);
```

## Error Handling

Catch errors locally via the promise, or globally via `onError`:

```ts
// 1. Global Error Handling
const store = createStore({
  slices: [playbackSlice],
  onError: ({ error, request }) => {
    if (request) {
      console.error(`${request.name} failed`);
    }

    console.error(error);
  },
});

// 2. Local Error Handling
try {
  await store.request.play();
} catch (error) {
  // ...
}
```

## Queue

A default queue is created automatically. Provide a custom queue for lifecycle hooks or custom
scheduling:

```ts
import { createQueue } from '@videojs/store';

const store = createStore({
  slices: [/* ... */],
  queue: createQueue({
    // Default scheduler for requests without schedule
    scheduler: flush => queueMicrotask(flush),

    // Lifecycle hooks
    onDispatch: (request) => {
      console.log('Started:', request.name);
    },

    onSettled: (request, { status, duration }) => {
      analytics.track(request.name, {
        status,
        duration,
      });
    },
  }),
});
```

### Queue API

```ts
const queue = store.queue; // accessed on the store

queue.queued; // requests waiting to execute
queue.pending; // requests currently executing

queue.dequeue('seek'); // remove from queue without executing
queue.clear(); // clear all queued

queue.flush(); // execute all queued now
queue.flush('playback'); // execute specific key now

queue.abort('playback'); // abort executing request
queue.abortAll(); // abort all executing
```

### Direct Queue Usage

You can use the queue directly without a store:

```ts
await queue.enqueue({
  name: 'myTask',
  key: 'task-key',
  input: { some: 'data' },
  schedule: delay(100),
  handler: async ({ signal }) => {
    // do work, check signal.aborted
    return result;
  },
});
```

## React

```ts
import { useStore, useSlice, useRequest, usePending } from '@videojs/store/react';

// Full state - re-renders on any change
function Player() {
  const state = useStore(store);
  return <div>{state.paused ? 'Paused' : 'Playing'}</div>;
}

// Selector - re-renders only when volume changes
function VolumeDisplay() {
  const volume = useStore(store, (s) => s.volume);
  return <div>{Math.round(volume * 100)}%</div>;
}

// Multiple values
function AudioControls() {
  const { volume, muted } = useStore(store, (s) => ({
    volume: s.volume,
    muted: s.muted
  }));

  return <div>{volume} {muted ? '🔇' : '🔊'}</div>;
}

// Track request state
function PlayButton() {
  const { dispatch, isPending, error } = useRequest(store.request.play);

  return (
    <button onClick={dispatch} disabled={isPending}>
      {isPending ? 'Starting...' : 'Play'}
    </button>
  );
}

// Check pending by key
function SeekBar() {
  const isSeeking = usePending(store, 'seek');
  return <input type="range" disabled={isSeeking} />;
}

// Check if slice exists
function QualityMenu() {
  const quality = useSlice(store, qualitySlice);

  if (!quality) return null;

  return <Menu items={quality.state.levels} />;
}
```

## Advanced

### Custom State

The store uses a simple state container by default. Provide a custom factory for
framework-native reactivity:

```ts
import { createStore } from '@videojs/store';

// Default
const store = createStore({
  slices: [/* ... */],
});

// Custom
const store = createStore({
  slices: [/* ... */],
  state: initial => new VueStateAdapter(initial),
});
```

Custom state must match the `State` class interface, where `K` is `keyof T`:

```ts
class State<T> {
  get value(): T;
  set(key: K, value: T[K]): void;
  patch(partial: Partial<T>): void;
  subscribe(listener: (state: T) => void): () => void;
  subscribeKeys(keys: K[], listener: (state: Pick<T, K>) => void): () => void;
}
```

### Capability Checking

Slices can expose capability via state. UI components check before rendering.

```ts
const qualitySlice = createSlice<Media>({
  initialState: {
   supported: false ,
   levels: [],
   currentLevel: -1
 },

  getSnapshot: ({ target, initialState }) => {
    if (target.canSetVideoQuality) {
      return {
        supported: true,
        levels: target.levels,
        currentLevel: target.currentLevel,
      };
    }

    return initialState; // supported: false
  },

  // ...
});

// UI checks capability
function QualityMenu() {
  const { supported, levels } = useStore(store, (s) => ({
    supported: s.supported,
    levels: s.levels
  }));

  if (!supported) return null;

  return <Menu items={levels} />;
}
```

### Optional Slices

Check if a slice exists at runtime:

```tsx
function QualityMenu() {
  const quality = useSlice(store, qualitySlice);

  if (!quality) return null;

  return <Menu items={quality.state.levels} />;
}
```

## Exports

```md
@videojs/store          # Core: createStore, createSlice, createQueue, Request
@videojs/store/dom      # Guards, frame(), idle(), onEvent()
@videojs/store/react    # useStore, useSlice, useRequest, usePending
```

## How It's Different

|                   | Redux/Zustand    | React Query           | @videojs/store             |
| ----------------- | ---------------- | --------------------- | -------------------------- |
| **Authority**     | You own state    | Server owns state     | External system owns state |
| **Mutations**     | Sync reducers    | Async server requests | Async requests to target   |
| **State source**  | Internal store   | HTTP cache            | `getSnapshot` from target  |
| **Subscriptions** | To store changes | To query cache        | To target events           |
| **Use case**      | App state        | Server data           | Media, WebSocket, hardware |

**Redux/Zustand**: Great for state you control. But when a `<video>` element is the source of truth, you end up fighting the pattern—syncing external state into the store, handling race conditions between your state and the element's actual state.

**React Query**: Perfect for server state with request/response. But media elements aren't request/response—they're live, event-driven systems with their own lifecycle.

**@videojs/store**: Built for external authority. The target is the source of truth. You observe it, request changes, and react to its events.

```ts
// Redux approach - fighting the abstraction
dispatch(play());

// Hope the video actually plays...
// Manually sync video.paused back to store...
// Handle race conditions...

// @videojs/store - working with the abstraction
await store.request.play(); // Resolves when actually playing
store.state.paused; // Always reflects video.paused
```

## Community

If you need help with anything related to Video.js v10, or if you'd like to casually chat with other
members:

- [Join Discord Server][discord]
- [See GitHub Discussions][gh-discussions]

## License

[Apache-2.0](./LICENSE)

[package]: https://www.npmjs.com/package/@videojs/store
[package-badge]: https://img.shields.io/npm/v/@videojs/store/next?label=@videojs/store@next
[discord]: https://discord.gg/JBqHh485uF
[gh-discussions]: https://github.com/videojs/v10/discussions
