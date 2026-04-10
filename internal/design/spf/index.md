---
status: draft
date: 2026-03-11
---

# SPF — Streaming Playback Framework

> **This is a living design document for a highly tentative codebase.** The current implementation captures useful early lessons but is expected to undergo significant architectural change in the near term. [architecture.md](architecture.md) and [decisions.md](decisions.md) document the current state; [primitives.md](primitives.md) is the forward-looking design.
>
> **Structure note:** These docs don't follow the standard [design doc template](../README.md) (`Decision → Context → Alternatives → Rationale`). SPF's scope — a multi-layered streaming framework with several interacting primitives — warrants a different structure: an index with glossary, per-primitive deep dives, and explicit "Open questions" sections for areas still in flux.

A lean, actor-based framework for HLS playback over MSE. Handles manifest parsing, quality selection, segment buffering, and end-of-stream coordination — without a monolithic player. Actors and Reactors are defined via declarative factory functions (`createMachineActor`, `createMachineReactor`) backed by TC39 Signals.

## Contents

| Document                                                   | Purpose                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| [index.md](index.md)                                       | Overview, problem, quick start, surface API                   |
| [primitives.md](primitives.md)                             | Foundational building blocks (Tasks, Actors, Reactors, State) |
| [signals.md](signals.md)                                   | Signals as the reactive primitive — decision, tradeoffs, friction |
| [actor-reactor-factories.md](actor-reactor-factories.md)   | Decided design for `createMachineActor` / `createMachineReactor` factories  |
| [text-track-architecture.md](text-track-architecture.md)   | Reference Actor/Reactor implementation + spike assessment     |
| [architecture.md](architecture.md)                         | Current implementation: layers, components, data flow         |
| [decisions.md](decisions.md)                               | Decided and open design decisions                             |

## Glossary

| Term | Definition |
| ---- | ---------- |
| **Actor** | Long-lived stateful worker that processes messages serially via a queue. Owns a context snapshot and a Runner. Key examples: `SourceBufferActor`, `SegmentLoaderActor`. |
| **Reactor** | Thin subscriber that observes state changes and translates them into actor messages. Contains no business logic beyond "should I send a message, and what should it say?" |
| **Task** | Ephemeral async work unit with status tracking (`pending`, `active`, `complete`, `error`) and abort support. |
| **Runner** | Task scheduler that controls execution ordering. `SerialRunner` runs one task at a time; `ConcurrentRunner` runs tasks in parallel. |
| **Snapshot** | Reactive read-only state of an Actor or Reactor, exposed for external consumption. |
| **Signal** | Reactive primitive from the [TC39 Signals proposal](https://github.com/tc39/proposal-signals). The layer underneath Actors and Reactors — see [signals.md](signals.md). |
| **MSE** | [Media Source Extensions](https://developer.mozilla.org/en-US/docs/Web/API/Media_Source_Extensions_API) — browser API for programmatically feeding media data to a `<video>` element. |
| **ABR** | Adaptive Bitrate — automatic quality selection based on estimated bandwidth. |
| **EWMA** | Exponentially Weighted Moving Average — the bandwidth estimation algorithm used for ABR decisions. |

## Problem

MSE-based adaptive streaming requires coordinating several concerns that don't naturally belong together: fetching segments, feeding a SourceBuffer, switching quality mid-stream, tracking what's buffered, and signaling end-of-stream at the right moment. In traditional players these concerns collapse into one or two large stateful classes, creating tight coupling and making it difficult to reason about ordering, in-flight work, or test individual pieces.

HLS adds another dimension: multivariant playlists (choosing among renditions), media playlists (knowing which segments exist), and the need to react to bandwidth changes in real time. Audio and video have separate SourceBuffers and separate fetch lifecycles but must stay in sync.

SPF addresses this by decomposing the problem into three layers — reactive state, actors, and reactors — each with a single job.

## Solution Overview

SPF is structured around three layers:

1. **Reactive state** — a batched, selector-based store that drives everything. Features observe state slices and send messages to actors.

2. **Actors** — durable workers that own a queue and a context snapshot. Each actor serializes its own operations. The two key actors are `SourceBufferActor` (MSE operations) and `SegmentLoaderActor` (fetch + append planning).

3. **Reactors** — thin subscribers that translate state changes into actor messages. They contain no logic beyond "should I send a message, and what should it say?"

HLS parsing, ABR, and buffer math live in the `core/` layer, which is DOM-free and independently testable.

```
  state (reactive)
      │  observes
      ▼
  reactors (thin)
      │  send messages
      ▼
  actors (stateful workers)
      │  execute tasks
      ▼
  MSE (SourceBuffer, MediaSource)
```

## Quick Start

```ts
import { createPlaybackEngine } from '@videojs/spf';

const engine = createPlaybackEngine();

// Attach the media element (triggers SourceBuffer setup, segment loading, etc.)
engine.owners.patch({ mediaElement: videoElement });

// Load an HLS stream
engine.state.patch({ presentation: { url: 'https://example.com/stream.m3u8' } });

// Play
videoElement.play();

// Tear down
engine.destroy();
```

## Surface API

### createPlaybackEngine

```ts
function createPlaybackEngine(options?: PlaybackEngineOptions): PlaybackEngine;
```

The single entry point. Returns a `PlaybackEngine` that owns the reactive state, owners ref, and all internal actors.

### PlaybackEngine

```ts
interface PlaybackEngine {
  state: State<PlaybackEngineState>;
  owners: Owners<PlaybackEngineOwners>;
  destroy(): void;
}
```

- `state` — patch to configure: `presentation`, `preload`, `selectedVideoTrackId`, `abrDisabled`, etc.
- `owners` — patch to inject platform dependencies: `mediaElement`, `mediaSource`, `videoBuffer`, `audioBuffer`.
- `destroy()` — tears down all actors, aborts all in-flight work.

### Key State Fields

```ts
interface PlaybackEngineState {
  presentation?: Presentation;          // loaded multivariant playlist
  preload?: 'none' | 'metadata' | 'auto';
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
  abrDisabled?: boolean;                // suppress ABR for manual selection
  bandwidthState?: BandwidthState;      // current bandwidth estimate
  currentTime?: number;
  playbackInitiated?: boolean;
}
```

### Key Owner Fields

```ts
interface PlaybackEngineOwners {
  mediaElement?: HTMLVideoElement;
  mediaSource?: MediaSource;
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
  textTracksActor?: TextTracksActor;
  segmentLoaderActor?: TextTrackSegmentLoaderActor;
}
```

## Related Docs

- [architecture.md](architecture.md) — how the layers connect
- [decisions.md](decisions.md) — why these choices
