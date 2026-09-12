# API Surface

The detailed surface for the [Video Ad API RFC](index.md). For motivation see [index.md](index.md); for design rationale and the format inventory that drove this shape see [decisions.md](decisions.md); for end-to-end usage per format see [examples.md](examples.md).

## Contents

- [Enumerations](#enumerations)
  - [AdFormat](#adformat)
  - [AdTriggerType](#adtriggertype)
  - [DismissReason](#dismissreason)
  - [AdCueState](#adcuestate)
  - [AdState](#adstate)
  - [AdServingMode](#adservingmode)
- [Core Interfaces](#core-interfaces)
  - [AdTrackList](#adtracklist)
  - [AdTrack](#adtrack)
  - [AdCue](#adcue)
  - [Ad](#ad)
  - [AdCueList](#adcuelist)
  - [AdList](#adlist)
  - [CompanionAd](#companionad)
  - [AdCreative](#adcreative)
  - [AdViewport](#adviewport)
  - [AdInteractivity](#adinteractivity)
  - [QRCodeInfo](#qrcodeinfo)
  - [SqueezebackMetadata](#squeezebackmetadata)
- [The timeupdate Event](#the-timeupdate-event)

## Enumerations

### AdFormat

Categorizes ad tracks per the IAB CTV Ad Portfolio. Each value corresponds to one `AdTrack` instance.

| Value           | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| `'linear'`      | Traditional in-stream ad that replaces content (pre/mid/post-roll).        |
| `'pause'`       | Ad triggered when the viewer pauses content.                               |
| `'menu'`        | Ad displayed within the platform UI/navigation, outside video playback.    |
| `'squeezeback'` | Ad displayed alongside resized content (L-Shape, Frame, Double Box).       |
| `'overlay'`     | Ad displayed over content without resizing it (Corner, Lower Third).       |
| `'in-scene'`    | Ad composited into the video scene (virtual billboard, product placement). |
| `'screensaver'` | Ad triggered by device/app inactivity.                                     |

```typescript
type AdFormat =
  | 'linear'
  | 'pause'
  | 'menu'
  | 'squeezeback'
  | 'overlay'
  | 'in-scene'
  | 'screensaver';
```

### AdTriggerType

Identifies what causes an ad cue to activate, generalizing across timeline-driven, user-action-driven, and device-state-driven triggers so the API supports the full range of CTV ad formats.

| Value            | Description                                                      |
| ---------------- | ---------------------------------------------------------------- |
| `'timeline'`     | Content reaches a specific time position (pre/mid/post-roll).    |
| `'user-action'`  | Viewer performs an action (pause, navigate to menu).             |
| `'device-state'` | Device/OS condition is met (inactivity timeout, power-on).       |
| `'programmatic'` | Server-initiated during content playback (overlay, squeezeback). |
| `'composited'`   | Pre-composed into the video stream at transcode time (in-scene). |

```typescript
type AdTriggerType =
  | 'timeline'
  | 'user-action'
  | 'device-state'
  | 'programmatic'
  | 'composited';
```

### DismissReason

Captures why an ad cue ended, which varies by format.

| Value                  | Description                                               |
| ---------------------- | --------------------------------------------------------- |
| `'completed'`          | Cue reached its natural duration.                         |
| `'viewer-dismissed'`   | Viewer explicitly dismissed the ad.                       |
| `'content-resumed'`    | Viewer resumed content playback (pause/screensaver cues). |
| `'navigated-away'`     | Viewer navigated away from the ad surface (menu cues).    |
| `'device-timeout'`     | Device timed out or shut off.                             |
| `'app-exited'`         | User exited the application.                              |
| `'skipped'`            | Viewer used a skip control.                               |
| `'replaced'`           | Another cue replaced this one (refresh cycle).            |

```typescript
type DismissReason =
  | 'completed'
  | 'viewer-dismissed'
  | 'content-resumed'
  | 'navigated-away'
  | 'device-timeout'
  | 'app-exited'
  | 'skipped'
  | 'replaced';
```

### AdCueState

Lifecycle state for `AdCue` instances.

| Value            | Description                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `'scheduled'`    | Cue is known but not yet triggered. Analogous to a VTTCue before the playhead reaches it. |
| `'activating'`   | Cue is transitioning to active (e.g., squeezeback content resize animation in progress).  |
| `'active'`       | Cue is fully presenting. Appears in `AdTrack.activeCues`.                                 |
| `'deactivating'` | Cue is transitioning out (e.g., squeezeback resize reversal).                             |
| `'completed'`    | Cue has finished. Remains in `AdTrack.cues` for history, but not in `activeCues`.         |
| `'error'`        | Cue failed to load or present.                                                            |

```typescript
type AdCueState =
  | 'scheduled'
  | 'activating'
  | 'active'
  | 'deactivating'
  | 'completed'
  | 'error';
```

### AdState

Lifecycle state for individual `Ad` instances within a cue.

| Value         | Description                                                                        |
| ------------- | ---------------------------------------------------------------------------------- |
| `'pending'`   | Ad is in the cue but not yet presenting (queued behind other ads in a linear pod). |
| `'active'`    | Ad is currently presenting to the viewer.                                          |
| `'completed'` | Ad has finished presenting.                                                        |
| `'skipped'`   | Ad was skipped by the viewer.                                                      |
| `'error'`     | Ad failed to load or render.                                                       |

```typescript
type AdState =
  | 'pending'
  | 'active'
  | 'completed'
  | 'skipped'
  | 'error';
```

### AdServingMode

Declares how ads on a given track are delivered, distinguishing the three fundamental serving architectures. This is a per-track property because non-linear and linear tracks can use different serving mechanisms within the same playback session. For example, a `'linear'` track may be `'ssai'` while a `'pause'` track is `'client-side'`.

Behavioral contract per value:

- **`'client-side'`**: The player switches to a separate ad stream for each break. Content pauses and resumes around each break. The player receives content-pause and content-resume signals, and the ad creative is fetched client-side via a VAST request.
- **`'ssai'`**: Ads are pre-stitched into the stream by a server. The stream plays continuously with no switching. Break detection is driven by timed metadata (HLS/DASH) in the stream. Content-pause and content-resume events do not fire.
- **`'sgai'`**: A hybrid model. The server signals ad break timing (via manifest markers or an out-of-band signaling channel), but the stream is not stitched and the creative is fetched and rendered client-side. The stream plays continuously, but a VAST request fires at each server-signaled break point.

| Value            | Description                                                                          |
| ---------------- | ------------------------------------------------------------------------------------ |
| `'client-side'`  | Client fetches and switches to ad creative. Content pauses around breaks.            |
| `'ssai'`         | Ads are stitched into the stream server-side. Stream plays continuously.             |
| `'sgai'`         | Server signals break timing; client fetches and renders creative. No stream switch.  |

```typescript
type AdServingMode = 'client-side' | 'ssai' | 'sgai';
```

## Core Interfaces

### AdTrackList

The top-level entry point, modeled after `TextTrackList`. This is the object a player exposes (e.g., `videoElement.adTracks`). Since tracks are grouped by format, the list typically has a small, bounded number of entries (one per supported format).

| Property            | Type                    | Description                                                                                                                                                                                   |
| ------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| length              | number (readonly)       | Number of `AdTrack` instances (bounded by supported formats).                                                                                                                                 |
| index               | AdTrack                 | Index access, like `TextTrackList[0]`.                                                                                                                                                        |
| servingMode         | AdServingMode \| null   | List-level default `AdServingMode`. Adapter sets this when the list is initialized. Individual `AdTrack` instances may override via their own `servingMode` for formats that use a different delivery mechanism within the same session (e.g., `'linear'` may be `'ssai'` while `'pause'` is `'client-side'`). Null if the adapter hasn't declared a list-level default. |

| Method                              | Returns         | Description                            |
| ----------------------------------- | --------------- | -------------------------------------- |
| getTrackById(id)                    | AdTrack \| null | Find a track by its unique ID.         |
| getTrackByFormat(format)            | AdTrack \| null | Find the track for a given `AdFormat`. |
| addEventListener(type, listener)    | void            | Standard EventTarget interface.        |
| removeEventListener(type, listener) | void            | Standard EventTarget interface.        |

**Events on AdTrackList:**

| Event       | Description                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| addtrack    | A new `AdTrack` has been registered (e.g., player enables overlay support). Parallels TextTrackList 'addtrack'. |
| removetrack | An `AdTrack` has been removed.                                                                                |
| change      | The active state of one or more tracks, cues, or ads has changed. Catch-all for UI updates.                   |

All event-firing interfaces in this hierarchy extend `EventTarget`, so the standard `addEventListener` options (`once`, `signal`) are available at every level. Consumers should scope per-cue and per-ad listeners with an `AbortSignal` tied to the cue lifecycle so listeners are removed when a cue deactivates; [examples.md](examples.md) demonstrates the pattern for each format.

```typescript
interface AdTrackList extends EventTarget {
  readonly length: number;
  readonly [index: number]: AdTrack;
  readonly servingMode: AdServingMode | null;

  getTrackById(id: string): AdTrack | null;
  getTrackByFormat(format: AdFormat): AdTrack | null;

  // Inherited from EventTarget:
  //   addEventListener('addtrack' | 'removetrack' | 'change', listener): void;
  //   removeEventListener(...): void;
}
```

### AdTrack

Each `AdTrack` represents a format-based lane for ad experiences. The player creates one `AdTrack` per supported ad format. Unlike `TextTrack`, ad tracks have no visibility mode property — they are always enabled. If a player supports a format, the track exists and is active. `AdTrack` does expose a `servingMode` property (see [AdServingMode](#adservingmode)), but this is not equivalent to `TextTrack.mode`: it declares how ads are delivered for that track, not whether the track is visible. The name `servingMode` was chosen specifically to avoid collision with the `TextTrack.mode` property.

| Property    | Type                   | Description                                                                                                                                                                                                                     |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id          | string (readonly)      | Unique identifier for this track (typically matches the format name).                                                                                                                                                           |
| format      | AdFormat (readonly)    | Which IAB ad format this track manages (`'linear'`, `'overlay'`, `'pause'`, etc.). Immutable after creation.                                                                                                                                |
| servingMode | AdServingMode (readonly) | How ads on this track are delivered. See [AdServingMode](#adservingmode). Set by the adapter when the track is initialized.                                                                                                       |
| label       | string (readonly)      | Human-readable label (e.g., 'Linear Ads', 'Overlay Ads'). Parallels `TextTrack.label`.                                                                                                                                          |
| cues        | AdCueList (readonly)   | All `AdCue` instances known to this track (scheduled, active, completed). Parallels `TextTrack.cues`.                                                                                                                           |
| activeCues  | AdCueList (readonly)   | `AdCue` instances currently in `'active'` or `'activating'` state. Parallels `TextTrack.activeCues`. Updated automatically as cue states change.                                                                                        |

**Methods on AdTrack:**

| Method                              | Returns | Description                     |
| ----------------------------------- | ------- | ------------------------------- |
| addEventListener(type, listener)    | void    | Standard EventTarget interface. |
| removeEventListener(type, listener) | void    | Standard EventTarget interface. |

**Events on AdTrack:**

Fired on an `AdTrack` when its cue list changes.

| Event     | Description                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| addcue    | An `AdCue` was added to this track's cues list.                                                                                             |
| removecue | An `AdCue` was removed from this track.                                                                                                     |
| cuechange | The activeCues list changed (a cue activated or deactivated). Parallels `TextTrack.cuechange`. Primary event for players to react to state transitions within a format lane. |

The `cuechange` event matches `TextTrack.cuechange` semantics, but `addcue` and `removecue` are deliberate deviations from the `TextTrack` model. Ad cues are dynamically scheduled post-load: SGAI signals, refresh cycles, and programmatic insertion can add or remove cues at any time, whereas WebVTT cues are typically static after load. Consumers need observability into schedule changes (e.g., rendering ad markers on a scrubber) that `cuechange` alone cannot provide, since it fires only for activation transitions.

`AdTrack` does not expose `addCue`/`removeCue` methods or a `getScheduledBreaks()` method. Cue management is the responsibility of the ad adapter, not the player consumer. The player reads from `cues`/`activeCues` and listens for events. This keeps the public API surface read-only and event-driven, reducing opportunities for misuse.

```typescript
interface AdTrack extends EventTarget {
  readonly id: string;
  readonly format: AdFormat;
  readonly servingMode: AdServingMode;
  readonly label: string;
  readonly cues: AdCueList;
  readonly activeCues: AdCueList;

  // Inherited from EventTarget:
  //   addEventListener('addcue' | 'removecue' | 'cuechange', listener): void;
  //   removeEventListener(...): void;
}
```

### AdCue

An `AdCue` represents a group of one or more related ads that present together or sequentially within a single activation window. For `'linear'` tracks, this is a pod/break (e.g., a mid-roll with 3 ads). For `'pause'` or `'screensaver'` tracks, it is a single presentation session (one or more ads that show while the content is paused). For `'overlay'` or `'squeezeback'` tracks, it is a single appearance. The cue has its own lifecycle state and fires group-level events.

| Property      | Type                        | Description                                                                                                                                                       |
| ------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id            | string                      | Unique identifier for this cue instance.                                                                                                                          |
| track         | AdTrack \| null (readonly)  | The `AdTrack` this cue belongs to.                                                                                                                                |
| state         | AdCueState                  | Current lifecycle state: `'scheduled'`, `'activating'`, `'active'`, `'deactivating'`, `'completed'`, or `'error'`.                                                 |
| triggerType   | AdTriggerType               | What causes this cue to activate (`'timeline'`, `'user-action'`, `'device-state'`, `'programmatic'`, `'composited'`).                                              |
| startTime     | number \| null              | Content timeline position (seconds) at which this cue activates. Non-null for `'timeline'` cues; null for event-driven cues.                                       |
| endTime       | number \| null              | Content timeline position at which this cue deactivates. May be null for indeterminate-duration cues.                                                              |
| duration      | number \| null              | Total expected duration of the cue in seconds. Derived from `endTime − startTime` for `'timeline'` cues; set explicitly for others. Null if indeterminate.         |
| currentTime   | number                      | Elapsed time since this cue became active, in seconds. Resets on each activation.                                                                                 |
| ads           | AdList (readonly)           | All `Ad` instances in this cue group. For a linear break, this is the ordered pod of ads. For a non-linear cue, this may be a single Ad or multiple concurrent ads. |
| activeAd      | Ad \| null (readonly)       | The `Ad` currently presenting within this cue. For linear pods, advances through the pod; for non-linear cues, typically the single active Ad.                    |
| dismissReason | DismissReason \| null       | Set when the cue deactivates. Null while the cue is active or scheduled.                                                                                          |
| metadata      | Record\<string, unknown\>   | Adapter-specific metadata pass-through (e.g., squeezeback layout data, overlay position data, break ID, ad server name).                                          |

**Methods on AdCue:**

| Method                              | Returns | Description                     |
| ----------------------------------- | ------- | ------------------------------- |
| addEventListener(type, listener)    | void    | Standard EventTarget interface. |
| removeEventListener(type, listener) | void    | Standard EventTarget interface. |

**Events on AdCue:**

Fired on individual `AdCue` instances. Analogous to VTTCue `enter` and `exit` events, extended for the ad lifecycle.

| Event        | Description                                                                                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| activating   | Cue is transitioning to active (e.g., squeezeback resize). State changes to `'activating'`.                                                                                                                                                            |
| activated    | Cue is fully active and presenting. State changes to `'active'`. Cue enters `AdTrack.activeCues`. Parallels VTTCue `enter`.                                                                                                                            |
| deactivating | Cue is transitioning out (e.g., squeezeback resize reversal). State changes to `'deactivating'`.                                                                                                                                                       |
| deactivated  | Cue is fully inactive. State changes to `'completed'`. Cue exits `activeCues`. Detail includes `DismissReason`. Parallels VTTCue `exit`.                                                                                                               |
| timeupdate   | Fires periodically while the cue is in `'active'` state, mirroring `HTMLMediaElement.ontimeupdate`. Enables countdown timers, progress bars, and other time-dependent UI at the cue/break level without polling. See [The timeupdate Event](#the-timeupdate-event). |
| adchange     | The `activeAd` within the cue changed (e.g., next ad in a linear pod started). Lets the player react to individual ad transitions without listening to every Ad.                                                                                       |
| error        | Cue failed to present. State changes to `'error'`.                                                                                                                                                                                                     |

```typescript
interface AdCue extends EventTarget {
  readonly id: string;
  readonly track: AdTrack | null;
  state: AdCueState;
  triggerType: AdTriggerType;
  startTime: number | null;
  endTime: number | null;
  duration: number | null;
  currentTime: number;
  readonly ads: AdList;
  readonly activeAd: Ad | null;
  dismissReason: DismissReason | null;
  metadata: Record<string, unknown>;

  // Inherited from EventTarget:
  //   addEventListener(
  //     'activating' | 'activated' | 'deactivating' |
  //     'deactivated' | 'timeupdate' | 'adchange' | 'error',
  //     listener,
  //   ): void;
}
```

### Ad

The `Ad` interface represents a single ad experience within a cue. It carries all per-ad creative metadata, lifecycle state, and fires individual ad events. In a linear pod, there may be 3–5 `Ad` instances in one `AdCue`, presenting sequentially. In a non-linear cue (e.g., a single overlay), there is typically one `Ad` instance.

`adViewport` describes the screen region where the ad creative renders. `contentViewport` describes the screen region where the player should display the underlying content alongside this ad — relevant for formats like Squeezeback where content is resized to make room for the ad. Both are expressed as insets using the [AdViewport](#adviewport) interface. Both are null when the format does not impose a specific layout constraint (e.g., in-scene compositing, external menu placements).

| Property        | Type                                | Description                                                                                                                                                |
| --------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id              | string                              | Unique identifier for this ad instance.                                                                                                                    |
| cue             | AdCue \| null (readonly)            | The `AdCue` this ad belongs to.                                                                                                                            |
| state           | AdState                             | Current lifecycle state: `'pending'`, `'active'`, `'completed'`, `'skipped'`, or `'error'`.                                                                |
| creative        | AdCreative                          | Metadata about the creative asset (see [AdCreative](#adcreative)).                                                                                         |
| adViewport      | AdViewport \| null                  | Screen region where the ad creative renders, as percentage insets. Null for external placements.                                                           |
| contentViewport | AdViewport \| null                  | Screen region where content should render alongside this ad. Non-null only for formats that resize content (e.g., Squeezeback). Null for all other formats. |
| duration        | number \| null                      | Total duration of this ad in seconds. Null for display creatives with no defined duration.                                                                 |
| currentTime     | number                              | Elapsed time since this ad became active, in seconds.                                                                                                      |
| skippable       | boolean                             | Whether the viewer can skip this ad.                                                                                                                       |
| skipOffset      | number \| null                      | Seconds from ad start before skip becomes available. Null if not skippable.                                                                                |
| audioPolicy     | 'required' \| 'optional' \| 'none'  | Whether this ad expects audio playback.                                                                                                                    |
| companionAds    | CompanionAd[]                       | Associated companion creatives, if any (see [CompanionAd](#companionad)).                                                                                  |
| interactivity   | AdInteractivity \| null             | SIMID/QR code metadata, if the ad supports interaction (see [AdInteractivity](#adinteractivity)).                                                          |
| position        | number                              | Position of this ad within the cue (0-indexed). For linear pods: the ad's position in the break.                                                           |
| metadata        | Record\<string, unknown\>           | Adapter-specific metadata (e.g., VAST wrapper IDs, creative IDs, ad server name).                                                                          |

**Methods on Ad:**

| Method                              | Returns | Description                                                                                                             |
| ----------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| skip()                              | void    | Request to skip this ad. Throws if not skippable or not in `'active'` state.                                                          |
| dismiss()                           | void    | Request to dismiss a non-linear ad. Only valid for formats that support viewer dismissal (`'pause'`, `'overlay'`, `'screensaver'`).   |
| addEventListener(type, listener)    | void    | Standard EventTarget interface.                                                                                         |
| removeEventListener(type, listener) | void    | Standard EventTarget interface.                                                                                         |

**Events on Ad:**

Fired on individual `Ad` instances within a cue.

| Event            | Description                                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| activated        | Ad started presenting. State changes to `'active'`.                                                                                                                                          |
| completed        | Ad finished presenting. State changes to `'completed'`.                                                                                                                                      |
| timeupdate       | Fires periodically while the ad is in `'active'` state, mirroring `HTMLMediaElement.ontimeupdate`. The ad's `currentTime` property reflects the updated value. See [The timeupdate Event](#the-timeupdate-event). |
| firstquartile    | 25% of ad duration elapsed.                                                                                                                                                                  |
| midpoint         | 50% of ad duration elapsed.                                                                                                                                                                  |
| thirdquartile    | 75% of ad duration elapsed.                                                                                                                                                                  |
| click            | User clicked/selected the ad. Detail includes `clickThroughUrl`.                                                                                                                             |
| skip             | User skipped the ad. State changes to `'skipped'`.                                                                                                                                           |
| skippablechanged | The `skippable` state changed (e.g., skip timer elapsed).                                                                                                                                    |
| pause            | Ad playback paused (for video creatives).                                                                                                                                                    |
| resume           | Ad playback resumed.                                                                                                                                                                         |
| error            | Ad failed to load or render. State changes to `'error'`.                                                                                                                                     |
| interactionstart | SIMID interactive session began.                                                                                                                                                             |
| interactionend   | SIMID interactive session ended.                                                                                                                                                             |
| refresh          | Non-linear ad creative was refreshed (pause/screensaver ads).                                                                                                                                |
| impression       | Ad impression was recorded per measurement guidelines.                                                                                                                                       |

```typescript
interface Ad extends EventTarget {
  readonly id: string;
  readonly cue: AdCue | null;
  state: AdState;
  creative: AdCreative;
  adViewport: AdViewport | null;
  contentViewport: AdViewport | null;
  duration: number | null;
  currentTime: number;
  skippable: boolean;
  skipOffset: number | null;
  audioPolicy: 'required' | 'optional' | 'none';
  companionAds: CompanionAd[];
  interactivity: AdInteractivity | null;
  position: number;
  metadata: Record<string, unknown>;

  skip(): void;
  dismiss(): void;

  // Inherited from EventTarget:
  //   addEventListener(
  //     'activated' | 'completed' | 'timeupdate' | 'firstquartile' |
  //     'midpoint' | 'thirdquartile' | 'click' | 'skip' |
  //     'skippablechanged' | 'pause' | 'resume' | 'error' |
  //     'interactionstart' | 'interactionend' | 'refresh' | 'impression',
  //     listener,
  //   ): void;
}
```

### AdCueList

A read-only, ordered collection of `AdCue` instances, returned by `AdTrack.cues` and `AdTrack.activeCues`.

| Property / Method | Type / Returns    | Description                                              |
| ----------------- | ----------------- | -------------------------------------------------------- |
| length            | number (readonly) | Number of `AdCue` instances in the list.                 |
| [index]           | AdCue             | Index access. `track.cues[0]` returns the first cue.     |
| getById(id)       | AdCue \| null     | Find an `AdCue` by its unique ID.                        |

```typescript
interface AdCueList {
  readonly length: number;
  readonly [index: number]: AdCue;
  getById(id: string): AdCue | null;
}
```

### AdList

A read-only, ordered collection of `Ad` instances, returned by `AdCue.ads`.

| Property / Method | Type / Returns    | Description                                                |
| ----------------- | ----------------- | ---------------------------------------------------------- |
| length            | number (readonly) | Number of `Ad` instances in the list.                      |
| [index]           | Ad                | Index access. `cue.ads[0]` returns the first ad in the cue. |
| getById(id)       | Ad \| null        | Find an `Ad` by its unique ID.                             |

```typescript
interface AdList {
  readonly length: number;
  readonly [index: number]: Ad;
  getById(id: string): Ad | null;
}
```

### CompanionAd

Metadata for a companion creative associated with an `Ad` (VAST `<CompanionAds>`). This interface is deliberately minimal: the RFC pins only the identity contract, and the full companion surface (sizing, resource types, required-display semantics, tracking) is tracked as an open question in [decisions.md § Companion ad surface](decisions.md#companion-ad-surface).

| Property | Type   | Description                           |
| -------- | ------ | ------------------------------------- |
| id       | string | Unique identifier for this companion. |

```typescript
interface CompanionAd {
  id: string;
}
```

### AdCreative

Metadata about the creative asset. Supports both video and non-video creatives. The MIME type (`mimeType`) is the primary signal for what kind of creative this is; callers should use it to distinguish video, image, and animated creatives.

| Property             | Type           | Description                                                      |
| -------------------- | -------------- | ---------------------------------------------------------------- |
| assetUrl             | string \| null | URL of the creative asset, if externally hosted.                 |
| mimeType             | string         | MIME type of the creative (e.g., video/mp4, image/png).          |
| width                | number         | Creative width in pixels.                                        |
| height               | number         | Creative height in pixels.                                       |
| aspectRatio          | string         | Aspect ratio string (e.g., '16:9', '1:1', '9:16').               |
| fileSize             | number \| null | File weight in bytes. Relevant for static creatives (IAB recommends under 350kB for display). |
| bitrate              | number \| null | For video creatives: bitrate in kbps.                            |
| codec                | string \| null | For video creatives: codec identifier (H.264, H.265, VP9, AV1).  |
| supportsTransparency | boolean        | Whether the creative uses alpha channel (relevant for overlays). |
| adId                 | string         | Primary ad identifier.                                           |
| creativeId           | string \| null | Creative-level identifier (distinct from the ad ID).             |
| adTitle              | string \| null | Human-readable ad title, if available.                           |
| clickThroughUrl      | string \| null | Destination URL when the viewer selects the ad.                  |

```typescript
interface AdCreative {
  assetUrl: string | null;
  mimeType: string;
  width: number;
  height: number;
  aspectRatio: string;
  fileSize: number | null;
  bitrate: number | null;
  codec: string | null;
  supportsTransparency: boolean;
  adId: string;
  creativeId: string | null;
  adTitle: string | null;
  clickThroughUrl: string | null;
}
```

### AdViewport

Describes the screen region an ad or content area occupies, expressed as insets from the edges of the player or screen. All values are percentages (0–100). This single interface is used for both `Ad.adViewport` (the ad's render region) and `Ad.contentViewport` (where content should be displayed alongside the ad), providing a consistent coordinate system across both concerns.

| Property | Type   | Description                                                             |
| -------- | ------ | ----------------------------------------------------------------------- |
| top      | number | Percentage inset from the top edge. 0 = flush with top of screen.       |
| right    | number | Percentage inset from the right edge. 0 = flush with right of screen.   |
| bottom   | number | Percentage inset from the bottom edge. 0 = flush with bottom of screen. |
| left     | number | Percentage inset from the left edge. 0 = flush with left of screen.     |

**AdViewport examples across formats:**

| Scenario                             | adViewport                                    | contentViewport                               | Notes                                                                              |
| ------------------------------------ | --------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| Linear / Screensaver (fullscreen)    | { top: 0, right: 0, bottom: 0, left: 0 }      | null                                          | Ad occupies the entire screen; content is replaced.                                |
| Overlay — Lower Third                | { top: 70, right: 0, bottom: 0, left: 0 }     | null                                          | Ad covers the bottom 30%. Content continues fullscreen behind it.                  |
| Overlay — Corner (bottom-right)      | { top: 75, right: 0, bottom: 0, left: 75 }    | null                                          | Ad covers a 25% region in the bottom-right corner.                                 |
| Squeezeback — L-Shape (bottom bar)   | { top: 60, right: 0, bottom: 0, left: 0 }     | { top: 0, right: 40, bottom: 40, left: 0 }    | Ad occupies the bottom 40%. Content is resized to the upper-left 60%.              |
| Squeezeback — Double Box (right)     | { top: 25, right: 0, bottom: 25, left: 50 }   | { top: 0, right: 50, bottom: 0, left: 0 }     | Ad occupies a centered box on the right half. Content fills the left half.         |
| Pause Ad (partial, 600×600)          | { top: 25, right: 25, bottom: 25, left: 25 }  | null                                          | Ad occupies the center 50% of the paused frame.                                    |

The player uses these viewports to position the ad creative and resize the content element without needing to know a format-specific layout name. This also means custom or future layouts that don't match any predefined format value are naturally supported.

```typescript
interface AdViewport {
  /** All values are percentages (0-100) of the player/screen dimensions. */
  top: number;
  right: number;
  bottom: number;
  left: number;
}
```

### AdInteractivity

| Property              | Type                        | Description                                          |
| --------------------- | --------------------------- | ---------------------------------------------------- |
| framework             | 'simid' \| 'custom' \| null | The interactivity framework in use.                  |
| simidUrl              | string \| null              | URL of the SIMID creative, if framework is 'simid'.  |
| qrCode                | QRCodeInfo \| null          | QR code metadata, if present.                        |
| supportsRemoteControl | boolean                     | Whether the ad responds to CTV remote control input. |

```typescript
interface AdInteractivity {
  framework: 'simid' | 'custom' | null;
  simidUrl: string | null;
  qrCode: QRCodeInfo | null;
  supportsRemoteControl: boolean;
}
```

### QRCodeInfo

| Property  | Type                                                            | Description                                                                                    |
| --------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| scanUrl   | string                                                          | The URL encoded in the QR code.                                                                |
| isDynamic | boolean                                                         | Whether the QR code is dynamically generated (sell-side managed) vs. burned into the creative. |
| position  | { x: number; y: number; width: number; height: number } \| null | Position within the creative, as percentages of creative dimensions.                           |

```typescript
interface QRCodeInfo {
  scanUrl: string;
  isDynamic: boolean;
  /** Position within the creative, as percentages of creative dimensions. */
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}
```

### SqueezebackMetadata

Typed metadata for `AdCue` instances on the `'squeezeback'` track, accessible via `cue.metadata`. This captures cue-level layout instructions for the player: the target content region and transition animation parameters. Note that each `Ad` in the cue also declares its own `adViewport` and `contentViewport` directly (see [Ad](#ad)). For the common case where all ads in a squeezeback share the same content region, `SqueezebackMetadata.contentViewport` and each `Ad`'s `contentViewport` will be equivalent; adapters should populate both to give the player flexibility in which it reads.

| Property           | Type       | Description                                                                                                                                                                                                                 |
| ------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| contentViewport    | AdViewport | Target viewport for the resized content during the squeezeback. The player uses this to shrink its video element. For an L-Shape, this might be { top: 0, right: 40, bottom: 40, left: 0 } (content in the upper-left 60%). |
| transitionDuration | number     | Duration of the content resize animation in milliseconds (IAB recommends 1000–2000ms).                                                                                                                                      |
| audioEnabled       | boolean    | Whether audio is enabled for this squeezeback instance.                                                                                                                                                                     |

```typescript
interface SqueezebackMetadata {
  /** Target viewport for the resized content during the squeezeback. */
  contentViewport: AdViewport;
  /** Resize animation duration in milliseconds (IAB: 1000-2000ms). */
  transitionDuration: number;
  audioEnabled: boolean;
}
```

## The timeupdate Event

The `timeupdate` event fires on both `AdCue` and `Ad` and parallels `HTMLMediaElement.ontimeupdate`.

Without it, the only way to track elapsed time on a cue or ad is to poll the `currentTime` property. This is the same problem `HTMLMediaElement` faced, and it was solved with `timeupdate`. The ad API adopts the same pattern.

**Firing semantics:**

- The adapter fires `timeupdate` on both `AdCue` and its `activeAd` while they are in an active state. This parallels how `HTMLMediaElement` fires `timeupdate` during playback.
- The recommended firing rate is approximately 4 times per second (every 250ms), matching the `HTMLMediaElement` specification's guidance. Adapters may fire more frequently but should not fire less than once per second.
- Each `timeupdate` event is a simple notification. The consumer reads the updated `currentTime` from the cue or ad object, just as they would read `HTMLMediaElement.currentTime` after a `timeupdate` on the video element.
- For video creatives backed by an `HTMLVideoElement`, the adapter can synchronize ad-level `timeupdate` events with the underlying video element's `timeupdate`. For non-video creatives (display, animated), the adapter drives timing from its own clock.
- When an ad is paused (e.g., the viewer pauses a video ad), `timeupdate` events stop on both the `Ad` and its parent `AdCue`. They resume when the ad resumes. This mirrors `HTMLMediaElement` behavior where `timeupdate` only fires during active playback.
- Quartile events (`firstquartile`, `midpoint`, `thirdquartile`) are fired as distinct events at the appropriate thresholds, not as properties of `timeupdate`. A consumer that only needs quartiles can ignore `timeupdate` entirely.

**Typical usage patterns:**

**Pattern 1 — Ad countdown timer.** Listen for `timeupdate` on the active `Ad`. Compute remaining time as `ad.duration − ad.currentTime`. Update the skip button or countdown UI.

```typescript
declare const ad: Ad;
declare const countdownEl: HTMLElement;

// Player-side: show remaining time on the currently active ad
ad.addEventListener('timeupdate', () => {
  if (ad.duration == null) {
    return;
  }
  const remaining = ad.duration - ad.currentTime;
  countdownEl.textContent = `Ad ends in ${Math.ceil(remaining)}s`;
});
```

**Pattern 2 — Break progress bar.** Listen for `timeupdate` on the active `AdCue`. Compute progress as `cue.currentTime / cue.duration`. Render a break-level progress bar spanning the entire pod.

```typescript
declare const cue: AdCue;
declare const progressBarEl: HTMLElement;

// Player-side: render a progress bar that spans the whole ad break
cue.addEventListener('timeupdate', () => {
  if (cue.duration === null) {
    return;
  }
  const progress = cue.currentTime / cue.duration;
  progressBarEl.style.width = `${Math.min(progress, 1) * 100}%`;
});
```

**Pattern 3 — Time-to-skip indicator.** Listen for `timeupdate` on the `Ad`. When `ad.currentTime ≥ ad.skipOffset`, the ad becomes skippable (also signaled by the `skippablechanged` event).

```typescript
declare const ad: Ad;
declare const skipButton: HTMLButtonElement;

// Player-side: enable/disable the skip button based on skipOffset
ad.addEventListener('timeupdate', () => {
  if (!ad.skippable || ad.skipOffset === null) {
    return;
  }

  const timeToSkip = ad.skipOffset - ad.currentTime;
  if (timeToSkip <= 0) {
    skipButton.disabled = false;
    skipButton.textContent = 'Skip Ad';
  } else {
    skipButton.disabled = true;
    skipButton.textContent = `Skip in ${Math.ceil(timeToSkip)}`;
  }
});

// Alternative: react to the event rather than polling skipOffset each tick
ad.addEventListener('skippablechanged', () => {
  skipButton.disabled = !ad.skippable;
});
```

**Pattern 4 — Non-linear ad timer.** For overlays or squeezebacks with a known duration, listen for `timeupdate` on the `AdCue` to display a dismissal countdown.

```typescript
declare const overlayCue: AdCue;
declare const dismissCountdownEl: HTMLElement;

// Player-side: "Dismissing in Ns" countdown for an overlay cue
overlayCue.addEventListener('timeupdate', () => {
  if (overlayCue.duration === null) {
    return;
  }
  const remaining = overlayCue.duration - overlayCue.currentTime;
  dismissCountdownEl.textContent = `Dismissing in ${Math.ceil(remaining)}s`;
});

overlayCue.addEventListener('deactivated', (e) => {
  dismissCountdownEl.textContent = '';
  const detail = (e as CustomEvent<{ dismissReason: DismissReason }>).detail;
  console.log('Overlay dismissed:', detail.dismissReason);
});
```
