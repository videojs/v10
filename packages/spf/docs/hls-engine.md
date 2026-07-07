# The HLS Engine

A reference walkthrough of how SPF composes a playback engine.

The HLS engine in `@videojs/spf/hls` is one specific composition — manifest resolution, track selection, MSE setup, segment loading, end-of-stream — but the patterns it uses are how any SPF playback engine is built. This doc walks the composition stage-by-stage and calls out the patterns that recur.

It assumes familiarity with HLS, MSE, and adaptive streaming. If you want to learn what a "switching set" is, look elsewhere. If you want to learn how SPF lets you turn those concepts into a composable, declarative engine, you're in the right place.

For SPF primitives (signals, reactors, tasks, actors), see [fundamentals.md](./fundamentals.md).

---

## The engine at a glance

`createSimpleHlsEngine` is a thin wrapper around `createComposition`. The full composition, lifted from `src/playback/engines/hls/engine.ts`:

```ts
const shareSignals = makeShareSignals<SimpleHlsEngineState, SimpleHlsEngineContext>();

export function createSimpleHlsEngine(
  config: SimpleHlsEngineConfig = {}
): Composition<SimpleHlsEngineState, SimpleHlsEngineContext> {
  return createComposition(
    [
      syncPreload,
      trackPlaybackInitiated,
      resolvePresentation,

      // Track selection (reads config for initial preferences)
      selectVideoTrack,
      selectAudioTrack,
      switchTextTrack,

      // Resolve selected tracks (fetch media playlists)
      resolveVideoTrack,
      resolveAudioTrack,
      resolveTextTrack,

      // Presentation duration
      calculatePresentationDuration,

      // MSE setup
      setupMediaSource,
      updateMediaSourceDuration,
      setupSourceBuffers,

      // Playback tracking
      trackCurrentTime,
      switchQuality,

      // Segment loading
      loadVideoSegments,
      loadAudioSegments,

      // End of stream coordination
      endOfStream,

      // Text tracks
      syncTextTracks,
      setupTextTrackActors,
      loadTextTrackSegments,

      // Hands writable signal refs to the consumer's onSignalsReady callback
      // so external code (the adapter, or any direct consumer) can drive the
      // engine. Placed last so other behaviors' setup has run by the time the
      // callback fires — initial state writes are visible to the consumer.
      shareSignals,
    ],
    { config, initialState }
  );
}
```

Read top to bottom, the engine tells a story: resolve a manifest, pick tracks, set up MSE, load segments, coordinate end-of-stream, render text tracks. Each line is a behavior — a small, focused unit of logic that owns one job. To build a different engine — fewer behaviors, different protocol, different platform — you change the list.

Three things are doing the work here:

1. **`createComposition`** — the SPF primitive that wires the behaviors together. It owns the lifecycle, derives the state and context signal maps from each behavior's declared `stateKeys` / `contextKeys`, and gives each behavior access to the slots it asks for plus the engine's static `config`.
2. **The behaviors** — independent, type-specialized objects built with `defineBehavior`. Each declares which slots it reads and writes and contributes its body. No engine-side wrappers — `selectVideoTrack`, `loadAudioSegments`, etc. are imported directly from their behavior modules.
3. **`shareSignals`** — a generic passthrough behavior that hands the composition's writable signal refs to a consumer-supplied `config.onSignalsReady` callback at setup time. The canonical way to drive the engine from outside.

The rest of this doc walks each stage.

---

## State, context, and config

Every SPF composition is parameterized by three shapes:

```ts
export interface SimpleHlsEngineState {
  /**
   * The presentation being played. A caller writes `{ url }`;
   * `resolvePresentation` parses the manifest and populates the rest.
   */
  presentation?: MaybeResolvedPresentation;
  preload?: 'auto' | 'metadata' | 'none';
  selectedVideoTrackId?: string;
  selectedAudioTrackId?: string;
  selectedTextTrackId?: string;
  bandwidthState?: BandwidthState;
  abrDisabled?: boolean;
  currentTime?: number;
  playbackInitiated?: boolean;
  mediaSourceReadyState?: MediaSource['readyState'];
}

export interface SimpleHlsEngineContext {
  mediaElement?: HTMLMediaElement;
  mediaSource?: MediaSource;
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
  textTracksActor?: TextTracksActor;
  textTrackSegmentLoaderActor?: TextTrackSegmentLoaderActor;
}

export interface SimpleHlsEngineConfig extends ShareSignalsConfig<SimpleHlsEngineState, SimpleHlsEngineContext> {
  initialBandwidth?: number;
  preferredAudioLanguage?: string;
  preferredSubtitleLanguage?: string;
  includeForcedTracks?: boolean;
  enableDefaultTrack?: boolean;
}
```

The split:

- **State** holds reactive playback data — the manifest, selected track ids, current time, bandwidth estimate. It flows through the composition over time. Each field is its own discrete signal that any behavior can read or (if the behavior typed the slot writable) write.
- **Context** holds **resources** — values with identity and imperative interfaces, not just data. The `<video>` element, the `MediaSource`, source buffers, the actors managing text-track lifecycles. If you'd pass the thing around by reference and call methods on it, it belongs in context. Behaviors observe and act on resources directly; the signal makes their lifecycle (appearance, replacement, removal) reactive.
- **Config** holds static creation-time options — thresholds, language preferences, feature flags. It doesn't change during the engine's lifetime. Behaviors read it directly, usually with a fallback. The HLS engine's config also extends `ShareSignalsConfig<S, C>` so consumers can pass `onSignalsReady` to capture writable signal refs (see Stage 10).

The shapes are unions of what every behavior in the composition needs. Adding a new behavior that requires a new state field means adding it to the engine's state interface. Removing a behavior is the inverse.

Each behavior receives `{ state, context, config }` — but only the slots it declared. The body literally cannot reference slots it didn't list, because the setup-param type only includes them. A behavior that only reads `mediaElement` doesn't see `bandwidthState` and can't accidentally interact with it. **Per-slot read/write intent is part of the type:** `Signal<T>` for writable slots, `ReadonlySignal<T>` for read-only — TS rejects `.set()` on a slot typed read-only.

---

## Stage 1 — Initial state and manifest resolution

The first three entries are the lead-in:

```ts
syncPreload,
trackLoadTriggers,
resolvePresentation,
```

**`syncPreload`** bidirectionally syncs `state.preload` and the media element's `preload` property — DOM-side values feed state on attach or source change, and state-side values propagate back to the element. A configurable default (`'metadata'`) backfills when neither side has supplied a value. This makes the preload mode reactive — anything downstream that wants to react to preload changes (for example, "should we eagerly fetch the manifest?") can subscribe to a signal instead of polling the DOM.

**`trackLoadTriggers`** sets `state.loadActivated` to `true` once a load-overriding event has fired for the current source — DOM `play` or `seeking`, or immediately on entry if the element is already in such a state (covering autoplay, native controls, or direct-DOM `play()` paths). The slot is sticky-true within a source identity (a URL or `mediaElement` change resets it). Why it matters: combined with `state.preload`, this is the engine's loading-semantics contract — behaviors that should defer work under `preload="none"` can gate on `!isBlockingPreload(preload) || loadActivated`, mirroring native `HTMLMediaElement` behavior. The adapter's `play()` co-writes `loadActivated = true` to signal programmatic intent. See [`features/preload-modes.md`](../../../internal/design/spf/features/preload-modes.md) for the full feature surface.

**`resolvePresentation`** is the first behavior that does real network work. It watches `state.presentation` and, when it sees an unresolved value (`{ url }` with no `id`), fetches the multivariant playlist, parses it, and writes the resolved `Presentation` back to the same slot. The lifecycle lives in one slot: a caller writes `{ url }`, the resolver replaces it with a fully populated `Presentation`. Behaviors that only need the URL read `presentation.url`; behaviors that need resolved fields use `isResolvedPresentation` (or check for `selectionSets`) to narrow.

A pattern shows up here that recurs throughout: **behaviors gate themselves on preconditions and write their results back to state.** They don't take inputs as function arguments. They read from a known signal slot, do their work, and write to a known signal slot. The composition is wired through state, not through call ordering.

Look at `selectVideoTrack`'s setup signature — the pattern in miniature:

```ts
export const selectVideoTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'],
  contextKeys: [],
  setup: ({ state }: {
    state: {
      presentation: ReadonlySignal<TrackSelectionState['presentation']>;
      selectedVideoTrackId: Signal<TrackSelectionState['selectedVideoTrackId']>;
    };
  }) =>
    effect(() => {
      const presentation = state.presentation.get();
      if (!presentation || state.selectedVideoTrackId.get()) return;
      const id = pickFirstTrackId(presentation, 'video');
      if (id) state.selectedVideoTrackId.set(id);
    }),
});
```

`presentation` is `ReadonlySignal` — the body can `.get()` it but not `.set()` (TS would reject the call). `selectedVideoTrackId` is `Signal` — readable and writable. `stateKeys` is the runtime expression of the same contract: the composition uses it to derive the state signal map.

---

## Stage 2 — Track selection

Once the manifest is resolved, the engine picks one track per type:

```ts
selectVideoTrack,
selectAudioTrack,
switchTextTrack,
```

Video and audio use `defineBehavior` exports from `playback/behaviors/select-tracks.ts`, with narrow `stateKeys` matching exactly the slots they touch:

- `selectVideoTrack` declares `['presentation', 'selectedVideoTrackId']`
- `selectAudioTrack` declares `['presentation', 'selectedAudioTrackId']`
- `switchTextTrack` (from `playback/behaviors/track-switching.ts`) declares `['presentation', 'selectedTextTrackId']` and resolves the standing `userTextTrackSelection` intent against the constrained, CDN-scoped renditions — reading `config` for preferred-language / default-track preferences. Unlike the simple `select*` variants it can resolve to no selection (captions are opt-in / off-able).

The behaviors share a small `pickFirstTrackId` helper for the presentation traversal, but the bodies are inlined per type. No engine-side wrappers, no `config.type` discriminant carried at runtime — each export is type-honest about which signal it writes (`state.selectedVideoTrackId.set(...)` vs. `state.selectedAudioTrackId.set(...)`).

The behaviors themselves are split across two locations on purpose:

- **Pure logic** lives in `media/primitives/select-tracks.ts` — `pickVideoTrack`, `pickAudioTrack`, `pickTextTrack` / `pickTextTrackFromTracks`. No signals, no effects. Just functions that take a `Presentation` (or track list) and a config and return an id.
- **Orchestrations** live in `playback/behaviors/select-tracks.ts` (`selectVideoTrack`, `selectAudioTrack`) and `playback/behaviors/track-switching.ts` (`switchTextTrack`, plus the `switch*` ABR variants). These wrap the pure logic in `effect()`, gate on preconditions, and write the chosen id to `state.selected{Video,Audio,Text}TrackId`.

The split keeps the framework-free helpers reusable outside SPF, while the SPF-integrated behaviors stay thin and easy to swap.

---

## Stage 3 — Track resolution

A selected track is just an id at first — its segment list still has to come from a *media playlist*. The next three behaviors fetch and parse those:

```ts
resolveVideoTrack,
resolveAudioTrack,
resolveTextTrack,
```

Like the selection behaviors, these are per-type specialized exports from `playback/behaviors/resolve-track.ts`. They share an internal helper `setupTrackResolution<K>(state, type, selectedKey)` that takes the type literal and the selected-track key as parameters; each export binds them at module load:

```ts
export const resolveVideoTrack = defineBehavior({
  stateKeys: ['presentation', 'selectedVideoTrackId'],
  contextKeys: [],
  setup: ({ state }: { state: ResolveTrackStateMap<'selectedVideoTrackId'> }) =>
    setupTrackResolution(state, 'video', 'selectedVideoTrackId'),
});
```

`setupTrackResolution` watches `state.presentation` and the matching `selectedXTrackId` for its type. When both are set, it finds the partially-resolved track, fetches its media playlist, parses it into segments, and writes the now-resolved track back into `state.presentation`. The state slot map is parameterized: `presentation` is `Signal<...>` (writable — the helper writes resolved tracks back to it), the selected-track key is `ReadonlySignal<...>` (the helper only reads it).

Three behaviors, one shared helper. From outside, you'd hardly know they share an implementation.

Now `state.presentation` is fully populated for the selected tracks. Everything downstream — duration, MSE, segment loading, end-of-stream — reads from there.

---

## Stage 4 — Presentation duration

```ts
calculatePresentationDuration,
```

`calculatePresentationDuration` reads the resolved tracks and computes the presentation's total duration (max of selected track durations). It writes the result back to `state.presentation` (patching the `duration` field onto the existing presentation). This is a small bookkeeping behavior — the duration is derived from data already in state — but breaking it out keeps the derivation reactive: any downstream behavior that needs to know the duration just reads `state.presentation.duration`, and re-runs when it changes.

It's separated from `resolveTrack` because the duration depends on *which* tracks are selected (the engine could change selection later, in theory, with a different duration). Keeping the derivation in its own behavior means every track-selection change automatically re-derives.

This is also the simplest example of the **pipeline pattern** on `state.presentation`: multiple behaviors write the same slot, each owning a different aspect of the value. The adapter seeds `{ url }`; `resolvePresentation` parses the manifest; `resolve{Video,Audio,Text}Track` patches in per-track segments; `calculatePresentationDuration` patches in the duration. Each writer reads the current value and writes a new one with their field added — they never overwrite a field someone else owns.

---

## Stage 5 — MSE setup

The next three behaviors stand up the MSE pipeline:

```ts
setupMediaSource,
updateMediaSourceDuration,
setupSourceBuffers,
```

This is where the engine first touches the media element directly. Up until now, behaviors have been operating on plain data in `state` — manifests, URLs, ids, durations. MSE is the bridge: a `MediaSource` attaches to the `<video>` element via `srcObject` (or an object URL), and `SourceBuffer`s under it accept appended segments.

**`setupMediaSource`** waits for two preconditions: a `mediaElement` in context and a `presentation.url` in state. When both arrive, it creates a `MediaSource`, attaches it to the element, and writes both back to context (`mediaSource`) and state (`mediaSourceReadyState`). The DOM event for "MediaSource is open" is bridged onto `state.mediaSourceReadyState` via the `onMediaSourceReadyStateChange` callback primitive — once that flips to `'open'`, the `mediaSource` is published to context so downstream behaviors can use it.

The split between context and state is deliberate. The MediaSource itself is a resource — you call `addSourceBuffer()` on it, you set its `duration` — so it lives in context. Its readyState is data — a string that other behaviors gate decisions on — so it lives in state. The DOM events that drive readyState changes get bridged into the SPF signal graph by the small primitive in `media/dom/mse/`, keeping `setupMediaSource` clean.

**`updateMediaSourceDuration`** waits for the resolved presentation duration (from stage 4) and a MediaSource that's open with idle source buffers, then writes `mediaSource.duration = presentation.duration`. The order matters: setting duration while a SourceBuffer has `updating === true` throws `InvalidStateError`, so the behavior waits for any in-flight appends to settle before writing.

This is the first place the engine has real coordination concerns: timing among multiple resources. The behavior expresses it declaratively — `effect()` re-runs when any input signal changes, and the gate function checks every precondition. There's no manual sequencing, no callbacks-on-callbacks. Each precondition becomes a signal read; the framework figures out when to fire.

**`setupSourceBuffers`** does the same lifecycle dance as `setupMediaSource`, but per-track: when a video or audio track is resolved and the MediaSource is open, it calls `addSourceBuffer()` with the track's mime/codec, wraps the resulting `SourceBuffer` in a `SourceBufferActor`, and publishes both the raw buffer and the actor onto context.

The actor wrapping is worth pausing on. A raw `SourceBuffer` is imperative: you call `appendBuffer(data)`, you wait for the `updateend` event, you handle errors. Multiple appends can collide. An actor — a state machine that owns the buffer — gives every consumer a single point of contact. They send a message ("append this segment"); the actor serializes the work, exposes its current state via a snapshot signal, and behaves predictably even when several behaviors want to write at once.

So context ends up with both `videoBuffer` (the raw `SourceBuffer`, used by `endOfStream` to read `buffered` ranges) and `videoBufferActor` (the wrapper, used by `loadSegments` to send append messages). Same lifetime, two roles.

---

## Stage 6 — Playback tracking and ABR

Once buffers are live and segments can be appended, the engine starts watching playback:

```ts
trackCurrentTime,
switchQuality,
```

**`trackCurrentTime`** mirrors the media element's `currentTime` onto `state.currentTime`. Same shape as `syncPreload` from stage 1: the DOM event becomes a signal write, and downstream behaviors gate on the reactive value rather than polling the element. `loadSegments` reads it to know how far ahead to fetch; `endOfStream` reads it to know whether the user has reached the end.

**`switchQuality`** is the ABR loop. It watches `state.bandwidthState` (a running estimate, written by `loadVideoSegments` after each successful segment fetch) and `state.selectedVideoTrackId`. When the estimate moves enough to justify a switch, it writes a different `selectedVideoTrackId`. That triggers `resolveVideoTrack` → `setupSourceBuffers` (if mime/codec changes) → `loadVideoSegments` to start fetching from the new variant.

Two patterns worth pausing on:

- **State is the bus.** The bandwidth estimator (`loadVideoSegments`) doesn't push to the quality switcher. The quality switcher doesn't pull from the loader. Both read `state.bandwidthState` and respond. Adding a third behavior that needs the estimate (a buffer-health probe, a telemetry stream) is the same: another reader, no rewiring.
- **Selection cascades.** Changing `selectedVideoTrackId` doesn't tell anything to "re-resolve, re-buffer, re-load." It just changes the value. The behaviors downstream were already reading it; they'll re-run because `effect()` tracked their reads. Re-resolution and re-buffering happen because the framework noticed.

The engine has no orchestrator. Each behavior is a small reactor plus a cleanup. The composition is the dataflow.

`switchQuality` is also the third writer to `selectedVideoTrackId` — `selectVideoTrack` does the default-pick on presentation load; `switchQuality` updates it for ABR; external code (the harness's manual rendition picker) overrides. The slot has multiple legitimate writers, disambiguated today via the `abrDisabled` flag (when true, `switchQuality` short-circuits). This is the **intent + reactive default** multi-writer pattern. A cleaner factoring exists (separate `manual` + `abr` slots, derive selected as `manual ?? abr`); see the TODO at `quality-switching.ts`.

---

## Stage 7 — Segment loading

```ts
loadVideoSegments,
loadAudioSegments,
```

Two type-specialized exports from `playback/behaviors/dom/load-segments.ts`. They share an internal helper `setupSegmentLoading(state, context, type, onThroughputSample?)` — the throughput-sample callback is what makes `bandwidthState` writable for `loadVideoSegments` (passes `(next) => state.bandwidthState.set(next)`) and read-only for `loadAudioSegments` (audio doesn't sample bandwidth).

This is the busiest behavior — the one that actually fetches segments, samples bandwidth, and pushes data into the source buffers.

`loadSegments` watches:
- `state.presentation` — for the resolved track of its type
- `state.selectedVideoTrackId` (or audio) — to know which track's segments to load
- `state.currentTime` — to know how far ahead to fetch
- `state.bandwidthState` — to keep a running estimate after each fetch (writable for video, read-only for audio)
- `context.videoBufferActor` (or audio) — to send append messages
- `context.mediaSource` — to know it's safe to operate on the buffer

When the preconditions are met, the behavior:

1. **Plans** which segments to fetch using a forward-buffer policy (look ahead from currentTime by some target buffer length, find segments whose ranges aren't already buffered). The planner is a pure function from `media/buffer/forward-buffer.ts` — given the segments, the buffered ranges, and currentTime, return the list of segments to fetch.
2. **Fetches and appends** each segment via the network layer, sampling timing to update `state.bandwidthState`. The `SourceBufferActor` receives `append` messages and serializes them; multiple in-flight calls don't collide.
3. **Records** segment metadata (id, byte size, timestamp) into the actor's context so `endOfStream` later knows the last segment is loaded.

The pure planner from `media/buffer/` is the same kind of split we saw in track selection: framework-free logic that takes data and returns data, lifted out of the orchestration. The behavior wraps it in `effect()`, gates on preconditions, and pushes the results to the actor.

A subtle bit: `loadSegments` doesn't await the actor's append messages serially in JS — it sends them and lets the actor own ordering. The actor's `SerialRunner` ensures `appendBuffer` calls happen one at a time on the underlying `SourceBuffer`, which is what the MSE spec requires. The behavior just sends.

---

## Stage 8 — End of stream

```ts
endOfStream,
```

A single behavior, but one that has to coordinate across the rest of the pipeline. Calling `MediaSource.endOfStream()` tells the browser the stream is done — without it, playback stalls at the end of the buffered range waiting for data that will never arrive. Calling it too early (or while a SourceBuffer is updating) causes errors that crash the demuxer.

`endOfStream` reads:
- `state.presentation` and `state.selected{Video,Audio}TrackId` — to know which tracks' last segments to wait for
- `state.mediaSourceReadyState` — must be `'open'` (not `'ended'` or `'closed'`)
- `context.mediaElement` — to check `readyState >= HAVE_METADATA` (a precondition Chrome enforces)
- `context.{video,audio}Buffer` — must exist for selected tracks
- `context.{video,audio}BufferActor` — to know if any are still updating
- `context.{video,audio}BufferActor.snapshot.context.segments` — to verify the last segment of each selected track has been appended

Every one of those reads happens inside an `effect()`. When *any* changes, the gate function reruns. When all preconditions line up, the behavior calls `mediaSource.endOfStream()`. Notably, `endOfStream` writes nothing — every state and context slot in its setup signature is `ReadonlySignal<T>`. The body's effect on the world is a DOM property assignment (`mediaSource.duration = ...`) and a method call (`mediaSource.endOfStream()`), not a signal write.

Two things this behavior makes visible about SPF compositions:

- **Coordination is just reading.** No callbacks, no publish/subscribe, no event bus. The behavior reads from state and context; the reactive graph re-runs it whenever any read changes. A composition with N behaviors and one shared state signal has N inputs to coordinate, not N² connections.
- **Actor snapshots are signals too.** `context.videoBufferActor?.snapshot.get()` is a regular signal read inside the effect. When the actor transitions from `'updating'` to `'idle'`, the snapshot signal fires, the effect re-runs, and `endOfStream` re-evaluates whether the gate is now passable. Actor state and engine state are the same kind of channel from a behavior's point of view.

The behavior also handles the seek-back case: if `appendBuffer` re-opens an `'ended'` MediaSource (per the MSE spec, a fresh append on an ended buffer transitions readyState back to `'open'`), `endOfStream` re-evaluates and may call `endOfStream()` again once the new last segment lands.

---

## Stage 9 — Text tracks

```ts
syncTextTracks,
setupTextTrackActors,
loadTextTrackSegments,
```

Text tracks are an interesting wrinkle. They don't go through MSE — VTT cues land directly on the `<track>` elements of the media element. The shape of this stage is therefore different from the MSE pipeline above: there are no source buffers, no append serialization, no end-of-stream gate. But the SPF patterns are the same.

**`syncTextTracks`** mirrors the resolved text-track list onto `<track>` elements under the media element. When a text track is selected (`state.selectedTextTrackId`), the matching `<track>` element gets `mode = 'showing'`; others go to `'disabled'`. The behavior also writes back to `selectedTextTrackId` when the user selects a track via the browser's native UI — making it a two-way DOM sync.

**`setupTextTrackActors`** is the actor-provider for text tracks, parallel to `setupSourceBuffers` for video/audio. It creates two actors — `TextTracksActor` (owns the cue list per track) and `TextTrackSegmentLoaderActor` (orchestrates per-segment fetches via the VTT resolver) — and publishes them onto context.

The cue parser (`resolveTextTrackSegment`) is supplied via engine config — it defaults to the DOM-bound `resolveVttSegment` resolver, which uses an offscreen `<track>` element to leverage the browser's VTT parser. A different engine could supply a different parser (a worker-based parser, a native VTT parser if one ever ships, etc.) without changing the behavior.

**`loadTextTrackSegments`** is the orchestrator. It watches the resolved text track and the actors, and dispatches `load` messages to the segment loader actor whenever new segments need fetching. The actor handles per-segment fetching (and abort on track switch); the orchestrator decides *when* to ask.

This is the same pattern as MSE: actor-as-resource (`setupTextTrackActors` puts it on context), orchestrator-as-behavior (`loadTextTrackSegments` decides when to send messages). Different platform, same shape.

---

## Stage 10 — `shareSignals`: external write surface

```ts
shareSignals,
```

Placed last in the composition for a reason. `shareSignals` is a generic passthrough behavior that hands the composition's writable signal refs to a consumer-supplied `config.onSignalsReady` callback at composition setup. Every other behavior has run by the time the callback fires, so initial state writes are visible to the consumer.

```ts
const engine = createSimpleHlsEngine({
  initialBandwidth: 2_000_000,
  onSignalsReady: ({ state, context }) => {
    // capture refs for later writes — keep the references, write through them.
    capturedState = state;
    capturedContext = context;
  },
});
```

The captured refs are the same `Signal<T>` objects every behavior in the composition shares. Writing through them drives the engine the same way an internal behavior would.

In `@videojs/spf/hls`, `SimpleHlsMediaMixin` is the canonical consumer. Its `attach()` / `set src` / `set preload` / `play()` methods all forward to writes on the captured refs:

```ts
attach(mediaElement: HTMLMediaElement): void {
  this.#signals.context.mediaElement.set(mediaElement);
}

set src(value: string) {
  // ... destroy previous engine, create new one ...
  this.#signals.state.presentation.set({ url: value });
}

play(): Promise<void> {
  // Signal play intent — enables loading even with preload="none"
  this.#signals.state.playbackInitiated.set(true);
  return this.#signals.context.mediaElement.get().play();
}
```

`shareSignals` is generic — the same factory works for any composition, parameterized over the engine's state/context shapes. `makeShareSignals<S, C>()` returns a `Behavior<StateSignals<S>, ContextSignals<C>, ShareSignalsConfig<S, C>>`. The HLS engine instantiates it once at module load.

Multi-writer slots are part of the picture here. `presentation` is written by the consumer (initial `{ url }` seed) AND by `resolvePresentation` (parsed manifest) AND by `resolve{Video,Audio,Text}Track` (per-track segments) AND by `calculatePresentationDuration` (duration). Each owns a different aspect — the pipeline pattern. `mediaElement` is written only externally — single-source, no internal writers. Per-slot read/write annotations make these patterns visible at each behavior's setup signature, not enforce a uniform "0-or-1 writer per slot" rule.
