# The HLS Engine

A reference walkthrough of how SPF composes a playback engine.

The HLS engine in `@videojs/spf/hls` is one specific composition — manifest resolution, track selection, MSE setup, segment loading, end-of-stream — but the patterns it uses are how any SPF playback engine is built. This doc walks the composition stage-by-stage and calls out the patterns that recur.

It assumes familiarity with HLS, MSE, and adaptive streaming. If you want to learn what a "switching set" is, look elsewhere. If you want to learn how SPF lets you turn those concepts into a composable, declarative engine, you're in the right place.

For SPF primitives (signals, reactors, tasks, actors), see [fundamentals.md](./fundamentals.md).

---

## The engine at a glance

`createSimpleHlsEngine` is a thin wrapper around `createComposition`. The full composition, lifted from `src/playback/engines/hls/engine.ts`:

```ts
export function createSimpleHlsEngine(
  config: SimpleHlsEngineConfig = {}
): Composition<SimpleHlsEngineState, SimpleHlsEngineOwners> {
  return createComposition(
    [
      syncPreloadAttribute,
      trackPlaybackInitiated,
      resolvePresentation,

      // Track selection (reads config for initial preferences)
      selectVideoTrack,
      selectAudioTrack,
      selectTextTrack,

      // Resolve selected tracks (fetch media playlists)
      resolveVideoTrack,
      resolveAudioTrack,
      resolveTextTrack,

      // Presentation duration
      calculatePresentationDuration,

      // MSE setup
      setupMediaSource,
      updateDuration,
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
      loadTextTrackCues,
    ],
    { config, initialState, initialOwners }
  );
}
```

Read top to bottom, the engine tells a story: resolve a manifest, pick tracks, set up MSE, load segments, coordinate end-of-stream, render text tracks. Each line is a behavior — a small, focused unit of logic that owns one job. To build a different engine — fewer behaviors, different protocol, different platform — you change the list.

Three things are doing the work here:

1. **`createComposition`** — the SPF primitive that wires the behaviors together. It owns the lifecycle and gives each behavior access to two shared reactive channels — `state` and `owners` — plus the engine's static `config`.
2. **The behaviors** — independent functions, each declaring its slice of the state and owners shapes and its job.
3. **The engine wrapper** — a few small helpers that adapt behaviors to the engine's specific needs (closing over media types, threading config). Nothing structural; just glue.

The rest of this doc walks each stage.

---

## State, owners, and config

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

export interface SimpleHlsEngineOwners {
  mediaElement?: HTMLMediaElement;
  mediaSource?: MediaSource;
  videoBuffer?: SourceBuffer;
  audioBuffer?: SourceBuffer;
  videoBufferActor?: SourceBufferActor;
  audioBufferActor?: SourceBufferActor;
  textTracksActor?: TextTracksActor;
  segmentLoaderActor?: TextTrackSegmentLoaderActor;
}

export interface SimpleHlsEngineConfig {
  initialBandwidth?: number;
  preferredAudioLanguage?: string;
  preferredSubtitleLanguage?: string;
  includeForcedTracks?: boolean;
  enableDefaultTrack?: boolean;
}
```

The split:

- **State** holds reactive playback data — the manifest, selected track ids, current time, bandwidth estimate. It flows through the composition over time. Each field is a slot in the state signal that any behavior can read or write.
- **Owners** holds **resources** — values with identity and imperative interfaces, not just data. The `<video>` element, the `MediaSource`, source buffers, the actors managing text-track lifecycles. If you'd pass the thing around by reference and call methods on it, it belongs in owners. Behaviors observe and act on resources directly; the signal makes their lifecycle (appearance, replacement, removal) reactive.
- **Config** holds static creation-time options — thresholds, language preferences, feature flags. It doesn't change during the engine's lifetime. Behaviors read it directly, usually with a fallback.

The shapes are unions of what every behavior in the composition needs. Adding a new behavior that requires a new state field means adding it to the engine's state interface. Removing a behavior is the inverse.

Each behavior receives `{ state, owners, config }` and reads or writes only the slots it cares about. Nothing else. A behavior that only reads `mediaElement` doesn't know about `bandwidthState` and can't accidentally interact with it. (The HLS engine's source aliases this argument shape as `Deps` for brevity in the wrapper helpers — it's a local convenience, not framework vocabulary.)

---

## Stage 1 — Initial state and manifest resolution

The first three entries are the lead-in:

```ts
syncPreloadAttribute,
trackPlaybackInitiated,
resolvePresentation,
```

**`syncPreloadAttribute`** mirrors the `<video preload>` attribute into `state.preload`. This makes the preload mode reactive — anything downstream that wants to react to preload changes (for example, "should we eagerly fetch the manifest?") can subscribe to a signal instead of polling the DOM.

**`trackPlaybackInitiated`** sets `state.playbackInitiated` to `true` once the user has tried to play (the element is no longer paused). It's a small reactor that watches the media element's `play`/`pause` events. Why it matters: behaviors that should only run after the user interacts (or after autoplay fires) can gate on `state.playbackInitiated`.

**`resolvePresentation`** is the first behavior that does real network work. It watches `state.presentation` and, when it sees an unresolved value (`{ url }` with no `id`), fetches the multivariant playlist, parses it, and writes the resolved `Presentation` back to the same slot. The lifecycle lives in one slot: a caller writes `{ url }`, the resolver replaces it with a fully populated `Presentation`. Behaviors that only need the URL read `presentation.url`; behaviors that need resolved fields use `isResolvedPresentation` (or check for `selectionSets`) to narrow.

A pattern shows up here that recurs throughout: **behaviors gate themselves on preconditions and write their results back to state.** They don't take inputs as function arguments. They read from a known signal slot, do their work, and write to a known signal slot. The composition is wired through state, not through call ordering.

---

## Stage 2 — Track selection

Once the manifest is resolved, the engine picks one track per type:

```ts
selectVideoTrack,
selectAudioTrack,
selectTextTrack,
```

These are *wrappers* defined in `engine.ts` that share their names with — and close over — the imported behaviors from `playback/behaviors/select-tracks.ts`. The imported behaviors accept their own configuration parameter (initial bandwidth for video, preferred language for audio, and so on); the wrapper closes over the engine's config and threads the relevant fields into the behavior:

```ts
import { selectVideoTrack as _selectVideoTrack } from '../../behaviors/select-tracks';

const selectVideoTrack = ({ config, ...deps }: Deps) =>
  _selectVideoTrack(deps, {
    type: 'video',
    ...(config.initialBandwidth !== undefined && { initialBandwidth: config.initialBandwidth }),
  });
```

The wrapper takes the natural name; the imported behavior gets a leading-underscore alias for local use. The composition list reads as a flat list of behaviors at the right level of abstraction — the wrappers vanish into anonymity, which is exactly right since they're just adapter glue.

This is the **wrapper pattern** that recurs throughout the engine. Two kinds, both visible in the composition list:

- **Media-type wrappers** (`loadVideoSegments`, `resolveVideoTrack`, …) close over a fixed `type: 'video' | 'audio' | 'text'` value. Their underlying behavior takes the type as config; the wrapper makes it concrete.
- **Config-aware wrappers** (`selectVideoTrack`, `switchQuality`, the engine-local versions) close over the engine's config and pass relevant fields to the underlying behavior's own config parameter.

The wrappers exist because the underlying behaviors are **engine-agnostic** — `_selectVideoTrack` doesn't know about `SimpleHlsEngineConfig` or that `bandwidthState` lives on engine state. It accepts a `VideoSelectionConfig` from its caller. The engine wrapper is the thin layer that says "for this engine's config, the initial bandwidth comes from `config.initialBandwidth`."

The behaviors themselves are split across two locations on purpose:

- **Pure logic** lives in `media/primitives/select-tracks.ts` — `pickVideoTrack`, `pickAudioTrack`, `pickTextTrack`, `canSelectTrack`, `shouldSelectTrack`. No signals, no effects. Just functions that take a `Presentation` and a config and return an id.
- **Orchestrations** live in `playback/behaviors/select-tracks.ts` — `selectVideoTrack`, `selectAudioTrack`, `selectTextTrack`. These wrap the pure logic in `effect()`, gate on preconditions, and write the chosen id to `state.selected{Video,Audio,Text}TrackId`.

The split keeps the SPF-free CML-style helpers reusable outside SPF, while the SPF-integrated behaviors stay thin and easy to swap.

---

## Stage 3 — Track resolution

A selected track is just an id at first — its segment list still has to come from a *media playlist*. The next three behaviors fetch and parse those:

```ts
resolveVideoTrack,
resolveAudioTrack,
resolveTextTrack,
```

These are media-type wrappers around the same `resolveTrack` behavior:

```ts
const resolveVideoTrack = (deps: Deps) => resolveTrack(deps, { type: 'video' as const });
```

`resolveTrack` watches `state.presentation` and the matching `selectedXTrackId` for its type. When both are set, it finds the partially-resolved track, fetches its media playlist, parses it into segments, and writes the now-resolved track back into `state.presentation`. (The `Presentation` type allows tracks to hold either a partially-resolved or fully-resolved shape — the URL is enough to find a track; the segments are what loadSegments needs.)

Three behaviors, one shared `resolveTrack`. Each closes over its `type` so the composition list stays flat. From outside, you'd hardly know they share an implementation.

Now `state.presentation` is fully populated for the selected tracks. Everything downstream — duration, MSE, segment loading, end-of-stream — reads from there.

---

## Stage 4 — Presentation duration

```ts
calculatePresentationDuration,
```

`calculatePresentationDuration` reads the resolved tracks and computes the presentation's total duration (max of selected track durations). It writes the result back to `state.presentation.duration`. This is a small bookkeeping behavior — the duration is derived from data already in state — but breaking it out keeps the derivation reactive: any downstream behavior that needs to know the duration just reads `state.presentation.duration`, and re-runs when it changes.

It's separated from `resolveTrack` because the duration depends on *which* tracks are selected (the engine could change selection later, in theory, with a different duration). Keeping the derivation in its own behavior means every track-selection change automatically re-derives.

---

## Stage 5 — MSE setup

The next three behaviors stand up the MSE pipeline:

```ts
setupMediaSource,
updateDuration,
setupSourceBuffers,
```

This is where the engine first touches the media element directly. Up until now, behaviors have been operating on plain data in `state` — manifests, URLs, ids, durations. MSE is the bridge: a `MediaSource` attaches to the `<video>` element via `srcObject` (or an object URL), and `SourceBuffer`s under it accept appended segments.

**`setupMediaSource`** waits for two preconditions: a `mediaElement` in owners and a `presentation.url` in state. When both arrive, it creates a `MediaSource`, attaches it to the element, and writes both back to owners (`mediaSource`) and state (`mediaSourceReadyState`). The DOM event for "MediaSource is open" is bridged onto `state.mediaSourceReadyState` via the `onMediaSourceReadyStateChange` callback primitive — once that flips to `'open'`, the `mediaSource` is published to owners so downstream behaviors can use it.

The split between owners and state is deliberate. The MediaSource itself is a resource — you call `addSourceBuffer()` on it, you set its `duration` — so it lives in owners. Its readyState is data — a string that other behaviors gate decisions on — so it lives in state. The DOM events that drive readyState changes get bridged into the SPF signal graph by the small primitive in `media/dom/mse/`, keeping `setupMediaSource` clean.

**`updateDuration`** waits for the resolved presentation duration (from stage 4) and a MediaSource that's open with idle source buffers, then writes `mediaSource.duration = presentation.duration`. The order matters: setting duration while a SourceBuffer has `updating === true` throws `InvalidStateError`, so the behavior waits for any in-flight appends to settle before writing.

This is the first place the engine has real coordination concerns: timing among multiple resources. The behavior expresses it declaratively — `effect()` re-runs when any input signal changes, and the gate function checks every precondition. There's no manual sequencing, no callbacks-on-callbacks. Each precondition becomes a signal read; the framework figures out when to fire.

**`setupSourceBuffers`** does the same lifecycle dance as `setupMediaSource`, but per-track: when a video or audio track is resolved and the MediaSource is open, it calls `addSourceBuffer()` with the track's mime/codec, wraps the resulting `SourceBuffer` in a `SourceBufferActor`, and publishes both the raw buffer and the actor onto owners.

The actor wrapping is worth pausing on. A raw `SourceBuffer` is imperative: you call `appendBuffer(data)`, you wait for the `updateend` event, you handle errors. Multiple appends can collide. An actor — a state machine that owns the buffer — gives every consumer a single point of contact. They send a message ("append this segment"); the actor serializes the work, exposes its current state via a snapshot signal, and behaves predictably even when several behaviors want to write at once.

So owners ends up with both `videoBuffer` (the raw `SourceBuffer`, used by `endOfStream` to read `buffered` ranges) and `videoBufferActor` (the wrapper, used by `loadSegments` to send append messages). Same lifetime, two roles.

---

## Stage 6 — Playback tracking and ABR

Once buffers are live and segments can be appended, the engine starts watching playback:

```ts
trackCurrentTime,
switchQuality,
```

**`trackCurrentTime`** mirrors the media element's `currentTime` onto `state.currentTime`. Same shape as `syncPreloadAttribute` from stage 1: the DOM event becomes a signal write, and downstream behaviors gate on the reactive value rather than polling the element. `loadSegments` reads it to know how far ahead to fetch; `endOfStream` reads it to know whether the user has reached the end.

**`switchQuality`** is the ABR loop. It watches `state.bandwidthState` (a running estimate, written by `loadSegments` after each successful segment fetch) and `state.selectedVideoTrackId`. When the estimate moves enough to justify a switch, it writes a different `selectedVideoTrackId`. That triggers `resolveVideoTrack` → `setupSourceBuffers` (if mime/codec changes) → `loadSegments` to start fetching from the new variant. (Like the track-selection wrappers, this is the engine's local version that closes over engine config; the underlying behavior is imported as `_switchQuality`.)

Two patterns worth pausing on:

- **State is the bus.** The bandwidth estimator doesn't push to the quality switcher. The quality switcher doesn't pull from the loader. Both read `state.bandwidthState` and respond. Adding a third behavior that needs the estimate (a buffer-health probe, a telemetry stream) is the same: another reader, no rewiring.
- **Selection cascades.** Changing `selectedVideoTrackId` doesn't tell anything to "re-resolve, re-buffer, re-load." It just changes the value. The behaviors downstream were already reading it; they'll re-run because `effect()` tracked their reads. Re-resolution and re-buffering happen because the framework noticed.

The engine has no orchestrator. Each behavior is a small reactor plus a cleanup. The composition is the dataflow.

---

## Stage 7 — Segment loading

```ts
loadVideoSegments,
loadAudioSegments,
```

Two media-type wrappers around `loadSegments`. This is the busiest behavior — the one that actually fetches segments, samples bandwidth, and pushes data into the source buffers.

`loadSegments` watches:
- `state.presentation` — for the resolved track of its type
- `state.selectedVideoTrackId` (or audio) — to know which track's segments to load
- `state.currentTime` — to know how far ahead to fetch
- `state.bandwidthState` — to keep a running estimate after each fetch
- `owners.videoBufferActor` (or audio) — to send append messages
- `owners.mediaSource` — to know it's safe to operate on the buffer

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
- `owners.mediaElement` — to check `readyState >= HAVE_METADATA` (a precondition Chrome enforces)
- `owners.{video,audio}Buffer` — must exist for selected tracks
- `owners.{video,audio}BufferActor` — to know if any are still updating
- `owners.{video,audio}BufferActor.snapshot.context.segments` — to verify the last segment of each selected track has been appended

Every one of those reads happens inside an `effect()`. When *any* changes, the gate function reruns. When all preconditions line up, the behavior calls `mediaSource.endOfStream()`.

Two things this behavior makes visible about SPF compositions:

- **Coordination is just reading.** No callbacks, no publish/subscribe, no event bus. The behavior reads from state and owners; the reactive graph re-runs it whenever any read changes. A composition with N behaviors and one shared state signal has N inputs to coordinate, not N² connections.
- **Actor snapshots are signals too.** `owners.videoBufferActor?.snapshot.get()` is a regular signal read inside the effect. When the actor transitions from `'updating'` to `'idle'`, the snapshot signal fires, the effect re-runs, and `endOfStream` re-evaluates whether the gate is now passable. Actor state and engine state are the same kind of channel from a behavior's point of view.

The behavior also handles the seek-back case: if `appendBuffer` re-opens an `'ended'` MediaSource (per the MSE spec, a fresh append on an ended buffer transitions readyState back to `'open'`), `endOfStream` re-evaluates and may call `endOfStream()` again once the new last segment lands.

---

## Stage 9 — Text tracks

```ts
syncTextTracks,
setupTextTrackActors,
loadTextTrackCues,
```

Text tracks are an interesting wrinkle. They don't go through MSE — VTT cues land directly on the `<track>` elements of the media element. The shape of this stage is therefore different from the MSE pipeline above: there are no source buffers, no append serialization, no end-of-stream gate. But the SPF patterns are the same.

**`syncTextTracks`** mirrors the resolved text-track list onto `<track>` elements under the media element. When a text track is selected (`state.selectedTextTrackId`), the matching `<track>` element gets `mode = 'showing'`; others go to `'disabled'`. This is reactive: changing the selection in state re-runs the effect, which flips the modes.

**`setupTextTrackActors`** is the actor-provider for text tracks, parallel to `setupSourceBuffers` for video/audio. It creates two actors — `TextTracksActor` (owns the cue list per track) and `TextTrackSegmentLoaderActor` (orchestrates per-segment fetches via the VTT resolver) — and publishes them onto owners.

In the engine, this is a wrapper that closes over the DOM-bound VTT resolver (`resolveVttSegment`):

```ts
import { setupTextTrackActors as _setupTextTrackActors } from '../../behaviors/dom/setup-text-track-actors';

const setupTextTrackActors = ({ owners }: Deps) =>
  _setupTextTrackActors({ owners, config: { resolveTextTrackSegment: resolveVttSegment } });
```

The underlying `_setupTextTrackActors` (in `playback/behaviors/dom/`) is parser-agnostic — it accepts any `resolveTextTrackSegment` function. The DOM-specific binding (using a hidden `<video>` + `<track>` element to leverage the browser's VTT parser) happens at the engine layer. A different engine could supply a different parser without changing the behavior.

**`loadTextTrackCues`** is the orchestrator. It watches the resolved text track and the actors, and dispatches `load` messages to the segment loader actor whenever new segments need fetching. The actor handles per-segment fetching (and abort on track switch); the orchestrator decides *when* to ask.

This is the same pattern as MSE: actor-as-resource (`setupTextTrackActors` puts it on owners), orchestrator-as-behavior (`loadTextTrackCues` decides when to send messages). Different platform, same shape.

---

## Two ways to call `createComposition`

A note on the engine's call to `createComposition` itself.

The HLS engine uses the *explicit* form — passing `<S, O, C>` type arguments to fix the engine's shape directly:

```ts
return createComposition<SimpleHlsEngineState, SimpleHlsEngineOwners, SimpleHlsEngineConfig>(
  [...behaviors],
  { config, initialState, initialOwners }
);
```

The minimal/inferred form lets TypeScript intersect each behavior's deps to compute the engine's shape:

```ts
const engine = createComposition([myBehavior]);
```

For engines that aggregate many wrapper-style behaviors (`(deps: Deps) => behavior(deps, {...})`) all sharing the same `Behavior<S, O, C>` type, TypeScript's distributive intersection inference can drop fields — e.g. for the HLS engine, `bandwidthState` would silently disappear from the inferred state, and `initialState: { bandwidthState: ... }` would be flagged as an unknown property. The explicit form sidesteps the inference and uses the engine's declared shapes directly.

The inferred form remains the right call for small or single-behavior compositions where the per-feature state slices are the source of truth. For aggregating engines, prefer explicit.
