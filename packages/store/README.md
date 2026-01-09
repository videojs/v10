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
import { createSlice, createStore } from '@videojs/store';

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
    target.addEventListener('volumechange', update, { signal });
  },

  request: {
    setVolume(volume: number, { target, meta, signal }) {
      target.volume = volume;
    },

    setMuted(muted: boolean, { target, meta, signal }) {
      target.muted = muted;
    },
  },
});
```

### Slice Type Inference

State and request types are fully inferred from the slice config:

```ts
import type { InferSliceRequests, InferSliceState } from '@videojs/store';

const audioSlice = createSlice<HTMLMediaElement>()({
  initialState: { volume: 1, muted: false },
  // ...
});

// Infer types from the slice
type AudioState = InferSliceState<typeof audioSlice>;
type AudioRequests = InferSliceRequests<typeof audioSlice>;
```

For stores with multiple slices:

```ts
import type { UnionSliceRequests, UnionSliceState } from '@videojs/store';

const slices = [audioSlice, playbackSlice] as const;

type MediaState = UnionSliceState<typeof slices>;
type MediaRequests = UnionSliceRequests<typeof slices>;
```

### Explicit Slice Types

For upfront type definitions, use `Request<Input, Output>`:

```ts
import type { Request } from '@videojs/store';

import { createSlice } from '@videojs/store';

interface AudioState {
  volume: number;
  muted: boolean;
}

interface AudioRequests {
  setVolume: Request<number>; // (volume: number) => Promise<void>
  setMuted: Request<boolean>; // (muted: boolean) => Promise<void>
  play: Request; // () => Promise<void>
  getDuration: Request<void, number>; // () => Promise<number>
}

const audioSlice = createSlice<HTMLMediaElement, AudioState, AudioRequests>({
  // Types enforced from interfaces
});
```

### Requests

Requests are operations against the target. Use function shorthand for simple cases, or full config for guards and scheduling.

```ts
import { onEvent } from '@videojs/utils/events';

request: {
  // Shorthand - just the handler
  setVolume(volume, { target }) {
    target.volume = volume;
  },

  // Async shorthand
  async seek(time, { target, signal }) {
    target.currentTime = time;
    await onEvent(target, 'seeked', { signal });
  },

  // Full config when needed
  play: {
    key: 'playback',
    guard: [],
    cancel: [],
    // ...
    async handler(_, { target, signal }) {
      target.play();
      await onEvent(target, 'play', { signal });
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
store.request.play(null, { source: 'user', reason: 'play-button' });
store.request.seek(30, { source: 'user', reason: 'slider-scrub' });
store.request.pause(null, { source: 'system', reason: 'ad-start' });

// Infer metadata from DOM event
store.request.play(null, createRequestMetaFromEvent(clickEvent)); // MouseEvent
```

Handlers receive metadata:

```ts
async handler(_, { target, signal, meta }) {
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

### Type Inference

```ts
import type { InferStoreRequests, InferStoreState } from '@videojs/store';

const store = createStore({ slices: [audioSlice, playbackSlice] });

type State = InferStoreState<typeof store>;
type Requests = InferStoreRequests<typeof store>;
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

### Destroying a Store

Clean up when the store is no longer needed:

```ts
// Detaches target, aborts pending requests, clears queue
store.destroy();
```

### Subscribing to State

```ts
// Subscribe to all state changes
const unsubscribe = store.subscribe((state) => {
  console.log('State changed:', state);
});

// Single value - only fires when volume changes
store.subscribe(
  (s) => s.volume,
  (volume) => console.log('Volume:', volume)
);

// Multiple values - auto-optimized with key-based subscription
store.subscribe(
  (s) => ({ volume: s.volume, muted: s.muted }),
  ({ volume, muted }) => updateAudioUI(volume, muted)
);

// Derived value
store.subscribe(
  (s) => Math.round(s.volume * 100),
  (percent) => console.log(`${percent}%`)
);

// Custom equality function
store.subscribe(
  (s) => s.playlist,
  (playlist) => renderPlaylist(playlist),
  { equalityFn: shallowEqual }
);
```

Slices sync state from the target via `getSnapshot`. The `update` callback triggers a sync, and the store only notifies subscribers for keys that actually changed:

```ts
subscribe: ({ target, update, signal }) => {
  // Each event triggers a full sync via getSnapshot
  // Only changed keys notify their subscribers
  target.addEventListener('timeupdate', update, { signal });
  target.addEventListener('durationchange', update, { signal });
};
```

## Request Configuration

### Keys

Requests with the same key coordinate together. Default key is the request name.

```ts
request: {
  play: {
    key: 'playback',
    handler: async (_, { target }) => { ... },
  },
  pause: {
    key: 'playback',  // same key - coordinates with play
    handler: async (_, { target }) => { ... },
  },
}
```

When a new request arrives with the same key:

- Queued request with that key is superseded
- Executing request with that key is aborted
- New request takes over

```ts
store.request.play(); // queued
store.request.pause(); // play superseded, pause queued
store.request.play(); // pause superseded, play queued
// only final play() executes
```

This supersession happens automatically via microtask batching—all requests in the same synchronous batch are collected, and only the last request per key actually executes.

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

Requests can cancel other in-flight requests by name. Cancellation happens immediately when the
request is enqueued, before guards.

```ts
request: {
  stop: {
    cancel: ['seek', 'preload'],  // Request names to cancel
    handler: (_, { target }) => target.pause(),
  },
}
```

### Guards

Guards gate request execution. A guard returns a `GuardResult`:

```ts
import type { Guard, GuardResult } from '@videojs/store';

// GuardResult = boolean | Promise<unknown>
// - Truthy → proceed
// - Falsy → cancel (throws REJECTED)
// - Promise resolves truthy → proceed
// - Promise resolves falsy → cancel
// - Promise rejects → cancel
```

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
    handler: (_, { target }) => target.media.play(),
  },
}
```

**Custom guard:**

```ts
import type { Guard } from '@videojs/store';

import { onEvent } from '@videojs/utils/events';

const canMediaPlay: Guard<HTMLMediaElement> = ({ target, signal }) => {
  if (target.readyState >= HAVE_ENOUGH_DATA) return true;
  return onEvent(target, 'canplay', { signal }); // wait for canplay
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

All store errors include a `code` for programmatic handling:

| Code         | Description                  |
| ------------ | ---------------------------- |
| `ABORTED`    | Request aborted via signal   |
| `CANCELLED`  | Cancelled by another request |
| `DESTROYED`  | Store or queue destroyed     |
| `DETACHED`   | Target detached              |
| `NO_TARGET`  | No target attached           |
| `REJECTED`   | Guard returned falsy         |
| `SUPERSEDED` | Replaced by same-key request |
| `TIMEOUT`    | Guard timed out              |

Catch errors locally via the promise, or globally via `onError`:

```ts
import { isStoreError } from '@videojs/store';

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
  if (isStoreError(error)) {
    switch (error.code) {
      case 'SUPERSEDED':
        // Another play/pause request took over - expected
        break;
      case 'REJECTED':
        // Guard failed - blocked
        break;
      case 'TIMEOUT':
        // Guard timed out waiting
        break;
      default:
        console.error(`[${error.code}]`, error.message);
    }
  }
}
```

## Queue

The queue manages request execution with automatic supersession and lifecycle tracking. A default queue is created automatically with the store.

### Queue API

```ts
const queue = store.queue;

// Task lifecycle map (pending/success/error) keyed by request name
queue.tasks;

// Abort tasks (queued + executing)
queue.abort('play'); // abort specific request
queue.abort(); // abort all

// Clear settled tasks (success/error results)
queue.reset('seek'); // clear specific request
queue.reset(); // clear all settled

// Subscribe to task changes
queue.subscribe((tasks) => {
  const playTask = tasks.play;
  if (playTask?.status === 'pending') {
    console.log('Play in progress...');
  }
});
```

### Task Lifecycle

Each request creates a task that transitions through states:

```ts
import { isErrorTask, isPendingTask, isSettledTask, isSuccessTask } from '@videojs/store';

const task = queue.tasks.play;

// Type guards for status checking
if (isPendingTask(task)) {
  console.log('In progress, started at:', task.startedAt);
}

if (isSettledTask(task)) {
  console.log('Duration:', task.settledAt - task.startedAt);
}

if (isSuccessTask(task)) {
  console.log('Result:', task.output);
}

if (isErrorTask(task)) {
  console.log('Failed:', task.error);
  console.log('Was cancelled:', task.cancelled);
}
```

### Direct Queue Usage

You can use the queue directly without a store:

```ts
import { createQueue } from '@videojs/store';

const queue = createQueue();

await queue.enqueue({
  name: 'myTask',
  key: 'task-key',
  input: { some: 'data' },
  handler: async ({ input, signal }) => {
    // do work, check signal.aborted
    return result;
  },
});
```

### Observing Tasks

Use `subscribe` to react to task changes—useful for loading states and error handling:

```ts
queue.subscribe((tasks) => {
  for (const [name, task] of Object.entries(tasks)) {
    if (task?.status === 'error' && !task.cancelled) {
      toast.error(`${name} failed: ${task.error}`);
    }
  }
});

// Analytics
queue.subscribe((tasks) => {
  for (const task of Object.values(tasks)) {
    if (task && task.status !== 'pending') {
      analytics.track('request', {
        name: task.name,
        status: task.status,
        duration: task.settledAt - task.startedAt,
      });
    }
  }
});
```

## Advanced

### Custom State

The store uses a simple state container by default. Provide a custom factory for
framework-native reactivity:

```ts
import { createStore } from '@videojs/store';

// Default
const store = createStore({
  slices: [
    /* ... */
  ],
});

// Custom
const store = createStore({
  slices: [
    /* ... */
  ],
  state: (initial) => new VueStateAdapter(initial),
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
