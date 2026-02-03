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
import { createStore, defineSlice } from '@videojs/store';

const volumeSlice = defineSlice<HTMLMediaElement>()({
  state: () => ({ volume: 1 }),
  attach: ({ target, set, signal }) => {
    const sync = () => set({ volume: target.volume });
    target.addEventListener('volumechange', sync, { signal });
  },
});

const store = createStore<HTMLMediaElement>()(volumeSlice);
store.attach(videoElement);

// State is flat on the store
const { volume } = store;
```

## Core Concepts

### Target

The target is a reference to the external system. Slices read from and write to it.

```ts
const videoElement = document.querySelector('video');
store.attach(videoElement);
```

### Slices

A slice defines state, how to sync it from the target, and actions to modify the target.

```ts
import { defineSlice } from '@videojs/store';
import { listen } from '@videojs/utils/dom';

const volumeSlice = defineSlice<HTMLMediaElement>()({
  state: ({ task, target }) => ({
    volume: 1,
    muted: false,

    // Sync - use target() directly
    setVolume() {
      target().volume = Math.max(0, Math.min(1, value));
    },

    // Task - tracked, coordinated
    toggleMute() {
      return task({
        key: 'mute',
        handler({ target }) {
          target.muted = !target.muted;
          return target.muted;
        },
      });
    },
  }),

  attach({ target, signal, set }) {
    const sync = () => set({ volume: target.volume, muted: target.muted });

    sync();

    listen(target, 'volumechange', sync, { signal });
  },
});
```

### Slice Type Inference

State types are fully inferred from the slice config:

```ts
import type { InferSliceState } from '@videojs/store';

const volumeSlice = defineSlice<HTMLMediaElement>()({
  state: () => ({ volume: 1, muted: false, /* actions */ }),
  // ...
});

// Infer types from the slice
type VolumeState = InferSliceState<typeof volumeSlice>;
// { volume: number; muted: boolean; changeVolume: ...; toggleMute: ... }
```

### Combining Slices

Use `combine` to merge multiple slices into one:

```ts
import { combine, createStore, defineSlice } from '@videojs/store';

const volumeSlice = defineSlice<HTMLMediaElement>()({ /* ... */ });
const playbackSlice = defineSlice<HTMLMediaElement>()({ /* ... */ });

// Combine into a single slice
const mediaSlice = combine(volumeSlice, playbackSlice);
const store = createStore<HTMLMediaElement>()(mediaSlice);
```

Behavior:
- State factories are called in order, results merged (last wins on conflict)
- All attach handlers run; errors are caught and reported via `reportError`
- Use `UnionSliceState<Slices>` for combined state type inference

```ts
import type { UnionSliceState } from '@videojs/store';

const slices = [volumeSlice, playbackSlice] as const;
type MediaState = UnionSliceState<typeof slices>;
```

### Actions

Actions modify the target. Use `task()` for operations—handlers receive `target` directly.

```ts
state: ({ task }) => ({
  volume: 1,

  // Action with tracking (has key)
  changeVolume(volume: number) {
    return task({
      key: 'volume',
      handler({ target }) {
        target.volume = volume;
        return target.volume;
      },
    });
  },

  // Fire-and-forget (no key)
  logVolume() {
    return task(({ target }) => {
      console.log('Current volume:', target.volume);
    });
  },
}),
```

The `task()` helper provides:

- **Tracked execution** — Tasks with a `key` appear in `store.pending`
- **Cancellation** — Handlers receive `signal: AbortSignal`
- **Coordination** — Tasks with the same key supersede each other
- **State access** — Handlers can read current state via `get()`

```ts
handler({ target, signal, get, meta }) {
  // target - the attached target
  // signal - AbortSignal for cancellation
  // get() - current state snapshot
  // meta - request metadata (from store.meta())
}
```

### Action Metadata

Pass metadata to actions for observability and debugging:

```ts
// From DOM event
store.meta(clickEvent).play();
store.meta(keyEvent).seek(10);

// Explicit metadata
store.meta({ source: 'keyboard', reason: 'shortcut' }).play();

// Chain multiple actions with same context
const m = store.meta(event);
m.play();
m.seek(30);
```

Handlers receive metadata via the context:

```ts
changeVolume(volume: number) {
  return task({
    key: 'volume',
    handler({ target, meta }) {
      console.log(`Volume change from: ${meta?.source}`);
      target.volume = volume;
    },
  });
},
```

## Store

The store connects a slice to a target.

```ts
// Simple
const store = createStore<HTMLMediaElement>()(volumeSlice);

// With combined slices and options
const store = createStore<HTMLMediaElement>()(
  combine(volumeSlice, playbackSlice),
  {
    onSetup: ({ store, signal }) => {
      // Called when store is created
    },

    onAttach: ({ store, target, signal }) => {
      // Called when target is attached
    },

    onError: ({ error, store }) => {
      // Global error handler
    },

    onTaskStart: ({ key, meta }) => {
      // Called when a tracked task starts
    },

    onTaskEnd: ({ key, meta, error }) => {
      // Called when a tracked task completes
    },
  }
);
```

### Type Inference

```ts
import type { InferStoreState, InferStoreTarget } from '@videojs/store';

const store = createStore<HTMLMediaElement>()(volumeSlice);

type State = InferStoreState<typeof store>;
type Target = InferStoreTarget<typeof store>;
```

### Attaching a Target

```ts
const detach = store.attach(videoElement);

// State syncs from target (flat access)
const { paused, volume } = store;

// Actions go to target (flat access)
store.play();
store.setVolume(0.5);

// Detach when done
detach();
```

### Destroying a Store

Clean up when the store is no longer needed:

```ts
// Detaches target, aborts pending tasks, cleans up
store.destroy();
```

### Subscribing to State

State is reactive—subscribe to be notified when any property changes:

```ts
const unsubscribe = store.subscribe(() => {
  const { volume } = store;
  console.log('State changed:', volume);
});
```

Mutations are auto-batched—multiple changes in the same tick trigger only one notification.

### Pending Tasks

Track in-flight async operations:

```ts
// Check if a task is running
if (store.pending.playback) {
  console.log('Playback task in progress...');
}

// Pending task info
const task = store.pending.volume;
if (task) {
  console.log(task.key);       // 'volume'
  console.log(task.startedAt); // timestamp
  console.log(task.meta);      // RequestMeta | null
}
```

## Task Configuration

### Keys

Tasks with the same key coordinate together. When a new task arrives with the same key, the pending task is aborted and the new one takes over.

```ts
state: ({ task }) => ({
  play() {
    return task({
      key: 'playback',
      handler: ({ target }) => target.play(),
    });
  },

  pause() {
    return task({
      key: 'playback', // same key - coordinates with play
      handler: ({ target }) => target.pause(),
    });
  },
}),
```

```ts
store.play();  // starts immediately
store.pause(); // aborts play, starts immediately
```

Dynamic keys for parallel execution:

```ts
// Each call gets unique key - no coordination
logEvent(data: unknown) {
  return task({
    key: Symbol(),
    handler: () => analytics.log(data),
  });
},

// Key based on input
loadTrack(trackId: string) {
  return task({
    key: `track-${trackId}`,
    handler: ({ target }) => target.loadTrack(trackId),
  });
},
```

### Mode

The `mode` option controls how tasks with the same key interact:

| Mode                    | Behavior                  | Use case            |
| ----------------------- | ------------------------- | ------------------- |
| `'exclusive'` (default) | Supersede pending task    | seek, pause, volume |
| `'shared'`              | Join pending task         | play                |

```ts
play() {
  return task({
    key: 'playback',
    mode: 'shared', // Multiple play() calls share the same outcome
    async handler({ target }) {
      await target.play();
    },
  });
},

pause() {
  return task({
    key: 'playback',
    mode: 'exclusive', // default - supersedes play
    handler: ({ target }) => target.pause(),
  });
},
```

With `mode: 'shared'`, multiple calls while a task is pending all resolve/reject together:

```ts
const p1 = store.play(); // starts
const p2 = store.play(); // joins p1
const p3 = store.play(); // joins p1
// All three resolve/reject together
```

### Cancels

Tasks can cancel other in-flight tasks by key:

```ts
import { CANCEL_ALL } from '@videojs/store';

stop() {
  return task({
    cancels: ['seek', 'preload'], // Keys to cancel
    handler: ({ target }) => target.pause(),
  });
},

load(src: string) {
  return task({
    cancels: CANCEL_ALL, // Cancel ALL pending tasks
    handler: ({ target }) => {
      target.src = src;
      target.load();
    },
  });
},
```

## Error Handling

All store errors include a `code` for programmatic handling:

| Code         | Description                  |
| ------------ | ---------------------------- |
| `ABORTED`    | Task aborted via signal      |
| `DESTROYED`  | Store destroyed              |
| `NO_TARGET`  | No target attached           |
| `SUPERSEDED` | Replaced by same-key task    |

Handle errors locally via the promise, or globally via `onError`:

```ts
import { isStoreError } from '@videojs/store';

// Global error handling
const store = createStore<HTMLMediaElement>()(volumeSlice, {
  onError: ({ error, store }) => {
    console.error('Store error:', error);
  },
});

// Local error handling
try {
  await store.play();
} catch (error) {
  if (isStoreError(error)) {
    switch (error.code) {
      case 'SUPERSEDED':
        // Another task took over - expected
        break;
      case 'NO_TARGET':
        // No media element attached
        break;
      default:
        console.error(`[${error.code}]`, error.message);
    }
  }
}
```

## Advanced

### State Primitives

The store uses explicit state containers internally. You can use these primitives directly:

```ts
import { createState, flush, isState } from '@videojs/store';

// Create state container
const state = createState({ volume: 1, muted: false });

// Read via .current
const { volume } = state.current; // 1

// Mutate via patch() - changes are auto-batched
state.patch({ volume: 0.5 });
state.patch({ volume: 0.5, muted: true });
// Only ONE notification fires (after microtask)

// Subscribe to changes
state.subscribe(() => {
  const { volume } = state.current;
  console.log('Changed:', volume);
});

// Check if value is state
isState(state); // true

// Force immediate notification (mainly for tests)
flush();
```

## How It's Different

|                   | Redux/Zustand    | React Query           | @videojs/store             |
| ----------------- | ---------------- | --------------------- | -------------------------- |
| **Authority**     | You own state    | Server owns state     | External system owns state |
| **Mutations**     | Sync reducers    | Async server requests | Async tasks to target      |
| **State source**  | Internal store   | HTTP cache            | Synced from target         |
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
await store.play();           // Resolves when task completes
const { paused } = store;     // Always reflects video.paused
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
