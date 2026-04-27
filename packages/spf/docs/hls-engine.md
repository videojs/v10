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
      selectVideoTrackFromConfig,
      selectAudioTrackFromConfig,
      selectTextTrackFromConfig,

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
      switchQualityFromConfig,

      // Segment loading
      loadVideoSegments,
      loadAudioSegments,

      // End of stream coordination
      endOfStream,

      // Text tracks
      syncTextTracks,
      setupDomTextTrackActors,
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
  /** Input: URL of the manifest to play. */
  presentationUrl?: string;
  /** Output: parsed manifest, written by `resolvePresentation`. */
  presentation?: Presentation;
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

**`resolvePresentation`** is the first behavior that does real network work. It watches `state.presentationUrl` (the input slot, written by the caller) and on change fetches the multivariant playlist, parses it, and writes the parsed `Presentation` back to `state.presentation` (the output slot). The two-slot split keeps the input shape (`string`) and the output shape (`Presentation`) honest with each other, and lets every downstream behavior declare `presentation?: Presentation` without a union or `any`. Setting `presentationUrl` to a different URL after resolution transitions back through `'resolving'` to refetch.

A pattern shows up here that recurs throughout: **behaviors gate themselves on preconditions and write their results back to state.** They don't take inputs as function arguments. They read from a known signal slot, do their work, and write to a known signal slot. The composition is wired through state, not through call ordering.

---

## Two ways to call `createComposition`

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

(Earlier drafts of this doc kept an `as SimpleHlsEngineState` cast to paper over the inference collapse. The explicit overload is the cleaner answer — the cast is gone.)

The inferred form remains the right call for small or single-behavior compositions where the per-feature state slices are the source of truth.
