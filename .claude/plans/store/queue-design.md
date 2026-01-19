# Store Queue Design

## Overview

The `@videojs/store` queue manages request execution for media player state. This document describes how the native `<video>` element handles async operations internally, and how our queue mirrors and extends that behavior.

## Native Media Element Queue

The HTML spec doesn't expose a formal "queue" API, but the media element has internal queuing behavior managed through the browser's event loop.

### Media Element Event Task Source

The spec defines a **media element event task source** used when queuing async operations:

> "To queue a media element task with a media element element and a series of steps steps, queue an element task on the media element's media element event task source given element and steps."

- [WHATWG HTML Spec: Media Elements](https://html.spec.whatwg.org/multipage/media.html)

This means media operations are queued as **tasks** in the event loop, not microtasks. When you set `currentTime`, the actual seek and resulting events (`seeking`, `seeked`) happen asynchronously on subsequent event loop ticks.

### Pending Play Promises

The spec maintains a **list of pending play promises** on each media element:

```
1. play() called → create promise, add to list
2. play() called again → create another promise, add to same list
3. Playback starts → resolve ALL promises in list
4. (or) Playback aborted → reject ALL promises with AbortError
```

This is documented in:

- [WHATWG HTML Spec: play() method](https://html.spec.whatwg.org/multipage/media.html#dom-media-play)
- [MDN: HTMLMediaElement.load()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/load)

Multiple `play()` calls don't queue multiple play operations — they share the fate of a single logical playback attempt.

### Load Algorithm

When `load()` is called, the media element:

1. Aborts any running resource selection algorithm
2. Takes all pending tasks from the media element event task source
3. **Immediately resolves or rejects pending play promises** (doesn't orphan them)
4. Removes pending tasks from the queue
5. Resets state (`paused = true`, `seeking = false`, `currentTime = 0`, etc.)

> "Basically, pending events and callbacks are discarded and promises in-flight to be resolved/rejected are resolved/rejected immediately when the media element starts loading a new resource."

- [WHATWG HTML Spec](https://html.spec.whatwg.org/multipage/media.html)

### Seek Behavior

Setting `currentTime` triggers the seeking algorithm:

- The property set returns immediately (sync)
- The actual seek happens async
- If you set `currentTime` again before `seeked` fires, the browser coalesces to the new target
- You get `seeking` event(s), then a single `seeked` at the final position

The browser doesn't queue seeks — it's **last-write-wins**.

### Key Native Characteristics

| Behavior                  | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| **Lossy/Coalescing**      | Same-type operations collapse (seeks, play calls)       |
| **Last-write-wins**       | New value supersedes pending operation                  |
| **Load as nuclear reset** | `load()` cancels everything, rejects pending promises   |
| **Ready-gating**          | Operations wait for appropriate `readyState`            |
| **Async via task queue**  | Operations execute on event loop, not synchronously     |
| **Play/pause interplay**  | `pause()` during pending play rejects with `AbortError` |
| **Shared fate for play**  | Multiple `play()` calls share single outcome            |
| **No retries**            | Failed operations don't retry automatically             |
| **No timeouts**           | Operations can hang indefinitely                        |

## Our Queue Design

### Philosophy

We mirror native behavior where it makes sense, and layer observability where native falls short.

**Match native:**

- Lossy/coalescing via `key`
- Last-write-wins via `SUPERSEDED`
- Load as nuclear reset via `CANCEL_ALL`
- Ready-gating via `guard`
- Async execution
- Play/pause coordination via shared `key`
- No retries
- No timeouts (but guards can timeout)

**Extend native:**

- Request identity (tasks have IDs)
- Promise per request (native only has this for `play()`)
- Observable status (`pending`, `success`, `error`)
- Cancellation reasons (`SUPERSEDED`, `CANCELLED`, `ABORTED`, etc.)
- Clean promise resolution (native orphans some promises)

### Sync Execution Model

Our queue doesn't actually "queue" in the traditional sense. When you call `enqueue()`:

1. **Immediately** abort any pending task with the same key (via `AbortController`)
2. **Immediately** start executing the new task
3. Return a promise that resolves/rejects when the task completes

This matches native behavior — `currentTime = x` starts the seek immediately, it doesn't wait for previous seeks to complete.

```ts
// Native
video.currentTime = 10; // starts immediately
video.currentTime = 20; // starts immediately, browser drops first

// Our queue
store.request.seek(10); // starts immediately
store.request.seek(20); // starts immediately, aborts first via signal
```

### Operation Comparison

#### Seek

**Native:**

```ts
video.currentTime = 10;
video.currentTime = 20;
video.currentTime = 30;
// Result: seeks to 30, intermediate seeks dropped
// Events: seeking (maybe multiple), seeked (once, at 30)
```

**Our queue:**

```ts
const p1 = store.request.seek(10); // starts
const p2 = store.request.seek(20); // aborts p1, starts
const p3 = store.request.seek(30); // aborts p2, starts
// p1 rejects SUPERSEDED
// p2 rejects SUPERSEDED
// p3 resolves when seeked
```

✓ Same outcome, better observability.

#### Play then Pause

**Native:**

```ts
const p = video.play();
video.pause();
// p rejects with AbortError
// element is paused
```

**Our queue:**

```ts
const p = store.request.play();
store.request.pause();
// p rejects with SUPERSEDED
// element is paused
```

✓ Same outcome, different error type.

#### Multiple Play Calls

**Native:**

```ts
const p1 = video.play();
const p2 = video.play();
const p3 = video.play();
// Playback starts → p1, p2, p3 ALL resolve
// Playback fails → p1, p2, p3 ALL reject
```

**Our queue (current):**

```ts
const p1 = store.request.play(); // starts
const p2 = store.request.play(); // supersedes p1
const p3 = store.request.play(); // supersedes p2
// p1 rejects SUPERSEDED
// p2 rejects SUPERSEDED
// p3 resolves or rejects based on outcome
```

⚠️ Different — we supersede, native shares fate.

**Our queue (with `mode: 'shared'`):**

```ts
// play configured with mode: 'shared'
const p1 = store.request.play(); // starts
const p2 = store.request.play(); // joins p1
const p3 = store.request.play(); // joins p1
// All three resolve/reject together
```

✓ Matches native with explicit opt-in.

#### Load

**Native:**

```ts
video.play();
video.load();
// play promise rejects with AbortError
// element resets completely
```

**Our queue:**

```ts
store.request.play();
store.request.load(); // cancel: CANCEL_ALL
// play promise rejects with CANCELLED
// element resets
```

✓ Same outcome, clean rejection.

### Request Configuration

#### Keys

Requests with the same `key` coordinate together. Default key is the request name.

```ts
request: {
  play: {
    key: 'playback',
    handler: ...
  },
  pause: {
    key: 'playback',  // same key — pause supersedes play
    handler: ...
  },
  seek: {
    // key defaults to 'seek'
    handler: ...
  },
}
```

#### Mode

The `mode` option controls how requests with the same key interact:

| Mode                    | Behavior                         | Use case            |
| ----------------------- | -------------------------------- | ------------------- |
| `'exclusive'` (default) | Supersede pending request        | seek, pause, volume |
| `'shared'`              | Join pending request, share fate | play                |

```ts
request: {
  play: {
    key: 'playback',
    mode: 'shared',
    handler: ...
  },
  pause: {
    key: 'playback',
    mode: 'exclusive',  // default
    handler: ...
  },
}
```

This mirrors the Web Locks API naming:

- [MDN: Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)

#### Cancel

The `cancel` option aborts other in-flight requests by name. Use `CANCEL_ALL` for nuclear reset (like `load()`).

```ts
import { CANCEL_ALL } from '@videojs/store';

request: {
  load: {
    cancel: CANCEL_ALL,  // cancels ALL pending requests
    handler: ...
  },
  stop: {
    cancel: ['seek', 'preload'],  // cancels specific requests
    handler: ...
  },
}
```

#### Guards

Guards gate request execution, similar to how native operations wait for appropriate `readyState`.

```ts
request: {
  seek: {
    guard: [hasMetadata],
    handler: (time, { target }) => {
      target.currentTime = time;
    },
  },
  play: {
    guard: timeout(canPlay, 5000),
    handler: ...
  },
}
```

Native has implicit ready-gating. Our guards make it explicit and configurable.

### API Placement: Store vs Queue

#### Queue Responsibilities

The queue is a general-purpose task executor:

- Task lifecycle (pending → success/error)
- Key-based coordination (supersede, shared)
- Abort via signal
- Observable task state

```ts
queue.enqueue({
  name: 'seek',
  key: 'seek',
  handler: async ({ signal }) => { ... },
});
```

#### Store Responsibilities

The store adds target-aware semantics:

- Target management (attach/detach)
- State synchronization (getSnapshot, subscribe)
- Guards (ready-gating)
- Request metadata
- Slice composition

```ts
const store = createStore({
  slices: [playbackSlice],
});

store.attach(videoElement);
store.request.seek(30, { source: 'user' });
```

#### Why Guards Live on Store

Guards are **target-aware**:

- They check `readyState`, `networkState`, target availability
- They need access to the target (via slice context)
- They're part of the request contract, not generic task execution

The queue doesn't know about targets. It just knows about tasks, keys, and abort signals. The store translates requests into queue tasks, including guard evaluation.

```ts
// Store transforms this:
store.request.seek(30);

// Into this queue task:
queue.enqueue({
  name: 'seek',
  key: 'seek',
  handler: async (ctx) => {
    // Guards evaluated by store before this runs
    await seekHandler(30, ctx);
  },
});
```

### Error Codes

| Code         | Description                                    | Native Equivalent             |
| ------------ | ---------------------------------------------- | ----------------------------- |
| `SUPERSEDED` | Replaced by same-key request                   | (implicit, no clean signal)   |
| `CANCELLED`  | Cancelled by another request (`cancel: [...]`) | AbortError on load()          |
| `ABORTED`    | Manually aborted via `queue.abort()`           | AbortError                    |
| `DESTROYED`  | Store or queue destroyed                       | (n/a)                         |
| `DETACHED`   | Target detached                                | (n/a)                         |
| `NO_TARGET`  | No target attached                             | (implicit failure)            |
| `REJECTED`   | Guard returned falsy                           | (implicit, operation ignored) |
| `TIMEOUT`    | Guard timed out                                | (native hangs forever)        |

## Summary

Our queue mirrors native media element behavior:

- Sync property sets → immediate execution
- Last-write-wins → key-based supersession
- Shared fate for play → `mode: 'shared'`
- Nuclear reset → `CANCEL_ALL`
- Ready-gating → guards

And extends it with:

- Request identity
- Promise per request
- Observable status
- Clean cancellation reasons

The goal is native-like performance with much better observability.

## References

- [WHATWG HTML Spec: Media Elements](https://html.spec.whatwg.org/multipage/media.html)
- [MDN: HTMLMediaElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement)
- [MDN: HTMLMediaElement.load()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/load)
- [MDN: Web Locks API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
- [Chromium: play() Promise Implementation](https://groups.google.com/a/chromium.org/g/blink-reviews-html/c/ZIGTQ1yhJRo)
- [WHATWG Issue #869: play() promise rejection](https://github.com/whatwg/html/issues/869)
