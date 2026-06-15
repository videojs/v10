---
status: draft
date: 2026-06-15
---

# AirPlay + MSE dual-source bridge

Make HLS playback AirPlay-capable on Safari with MSE playback.

Tracking issue: [videojs/v10#1260](https://github.com/videojs/v10/issues/1260).

## Problem

Safari can only AirPlay HLS to a receiver when the `<video>` element exposes a **natively-playable** source.
With MSE (hls.js or SPF), the playback surface is a `srcObject` / object URL; Safari has no native source to hand off.
WebKit's solution is the **dual-source pattern**:

- inject a child `<source type="application/x-mpegURL" src="<manifest>">`,
- flip `disableRemotePlayback` off,
- and suspend MSE loading while AirPlay is active so the local pipeline isn't double-fetching alongside the receiver.

### First approach: HlsJsMedia Mixin (new SPF behavior TBD)

As other Mixins in `packages/core/src/dom/media/hls` attaches to the HlsJsMediaBase and accesses both the video element (to add the source element and flip `disableRemotePlayback` off) and can access the engine to control playback.

With this approach we would have to create a Mixin for each engine; not so bad as we currently would have just hls.js and SPF. However, it does add a new module where `webkitcurrentplaybacktargetiswirelesschanged` event is referenced. There's no need to abstract the engine since the Mixin is engine specific.

Files to be modified:

**hls.js side** (already implemented; would re-land):

- [packages/core/src/dom/media/hls/airplay-bridge.ts](../../packages/core/src/dom/media/hls/airplay-bridge.ts) — `HlsJsMediaAirPlayMixin`: injects fallback `<source>`, flips `disableRemotePlayback`, listens for the wireless event (debounced), calls `engine.stopLoad()` / detach + reattach + `engine.startLoad()`.
- [packages/core/src/dom/media/hls/hlsjs.ts](../../packages/core/src/dom/media/hls/hlsjs.ts) — slot the mixin into the `HlsJsMedia` stack.

**SPF side** (new behavior — symmetric pattern, different layer):

TBD

### Second approach: AirPlay Bridge on remote playback feature

Extend the remote-playback feature to add source fallback, modify `disableRemotePlayback` and start/stop loading.

For this approach to work we would need to create some interface for MSE based engines that expose media url (to be set on `<source>` element), pause and resume loading. This way remotePlaybackFeature owns all airplay/remote-playback logic. It also involves creating a new interface and likely adapters to adapt the engines to those interfaces, again one per engine.

Files to be modified:

**Shared contract:**

- [packages/core/src/core/media/types.ts](../../packages/core/src/core/media/types.ts) — declare the `LoadControl` capability (`suspendLoad` / `resumeLoad` / `currentSourceUrl`).
- [packages/core/src/dom/media/predicate.ts](../../packages/core/src/dom/media/predicate.ts) — `supportsLoadControl(media): media is Media & LoadControlCapable` type guard, alongside the existing `isMediaRemotePlaybackCapable`.

**Feature (owns the bridge):**

- [packages/core/src/dom/store/features/remote-playback.ts](../../packages/core/src/dom/store/features/remote-playback.ts) — inside the WebKit branch, guard on `supportsLoadControl(media)`, set up the bridge: source injection, `disableRemotePlayback` flip, debounced wireless listener, `media.suspendLoad()` / `resumeLoad()`. Cleanup via the existing `signal`.

**hls.js adapter (implements `LoadControlCapability`):**

- [packages/core/src/dom/media/hls/index.ts](../../packages/core/src/dom/media/hls/index.ts) — `HlsMedia` implements `suspendLoad` / `resumeLoad` / `currentSourceUrl`, delegating to the active `HlsJsMedia` delegate. `resumeLoad` must detach + reattach + `startLoad` because Safari invalidates the MSE attachment during AirPlay.
- The standalone hls.js mixin from approach 1 goes away — no `airplay-bridge.ts` under `packages/core/src/dom/media/hls/`.

**SPF adapter (implements `LoadControlCapability`):**

TBD

### `ControlLoad` capability

Optional shape on the `Media` adapter. Detected with a type guard;
absent on adapters that don't drive their own loader (e.g.
`NativeHlsMedia` — the browser owns loading).

```ts
interface ControlLoadCapable {
  /** Pause segment loading. Idempotent. */
  suspendLoad(): void;
  /** Resume segment loading from the current state. Idempotent. */
  resumeLoad(): void;
  /** URL for source currently driving the engine. Empty when not loaded. */
  readonly currentSourceUrl: string;
}

function supportsLoadControl(media: unknown): media is Media & ControlLoadCapable;
```

| Member             | Required behavior                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `suspendLoad`      | Stop the engine from issuing new segment fetches / appends. No effect on the element.                  |
| `resumeLoad`       | Bring the engine back to a loading state. Must handle MSE detachment if the host platform requires it. |
| `currentSourceUrl` | The URL the fallback `<source>` should mirror. Updates when the engine's source changes.               |
Internally, the feature gains one private helper:

```ts
function setupAirPlayBridge(
  media: Media & ControlLoadCapable,
  signal: AbortSignal,
): void;
```

 Driven by `signal` for cleanup. No exported surface.

## Some notes for implementation

Approach 1 has already been tested as a PoC there's a couple details to point out:

When disconnecting from AirPlay, `engine.startLoad` is not necessary and would cause unexpected errors. (See "Debouncing the WebKit handoff burst"). Edge cases are to be tested.

### Lifecycle ordering

`remotePlaybackFeature.attach()` runs when the player store mounts. At that point `media.engine` is typically `null` - the engine is created lazily on first `src` assignment, which happens after the player upgrades. The bridge can't inject the `<source>` or read `currentSourceUrl` until the engine exists.

The bridge waits for `loadstart` on the media. By the time `loadstart` fires, the adapter has attached its engine, the target `<video>` is live, and `currentSourceUrl` returns a real value. Setup runs once per source on `loadstart`; the next source change fires `loadstart` again, and the bridge updates the `<source>` `src` in place.

```txt
player attach → feature.attach()    [engine == null, defer]
                  ↓
              listen('loadstart')
                  ↓
src set      → engine created
                  ↓
loadstart fires → bridge sets up:
                    • disableRemotePlayback = false
                    • append <source type=…m3u8 src=currentSourceUrl>
                    • listen for wireless event (debounced)
                    • initial sync against current wireless state
```

`'loadstart'` was chosen over alternatives (custom adapter events, deferring to the first availability event) because it already fires on both adapters via the standard event-forwarding
pipeline. No adapter contract change is needed.

### Debouncing the WebKit handoff burst

On first AirPlay connect, the wireless event fires three times. The middle `false` is real - Safari's `currentSrc` is mid-swap from the MSE blob to the fallback `<source>` - but acting on it calls
`resumeLoad()` against an MSE that's being torn down for the handoff. hls.js surfaces this as a fatal `InvalidStateError`.

The bridge schedules the sync on a short debounce (~100ms) so the burst collapses to one observation of the settled wireless value. The initial sync on bridge setup is immediate - state is stable at that point and no burst is in flight.

| Sequence                            | Without debounce       | With debounce          |
| ----------------------------------- | ---------------------- | ---------------------- |
| First connect `true → false → true` | suspend / **resume (error)** / suspend | one settled `suspend`  |
| Disconnect `false`                  | resume                 | one settled `resume`   |
| Reconnect `true`                    | suspend                | one settled `suspend`  |

The debounce window is part of the bridge, not the adapter. Each `resumeLoad()` and `suspendLoad()` implementation is fired-and-forget from the bridge's perspective.

## Prior art

- **WebKit — [MSE + AirPlay dual-source pattern](https://webkit.org/blog/15036/how-to-use-media-source-extensions-with-airplay/).**
  Source: inject a child `<source>` with the native HLS URL, flip
  `disableRemotePlayback` off, suspend MSE while wireless. This
  design is a direct application — what we add is the cross-engine
  seam and the burst handling.
- **hls.js — [issue #6482](https://github.com/video-dev/hls.js/issues/6482).**
  Confirms the pattern (`stopLoad` / `startLoad` toggle on the
  wireless event) and the recovery requirement on resume. luwes'
  snippet in #1260 is the bare hls.js form; the Safari burst and the
  MSE detach gap are the gaps to fill on top.
- **Apple — [Delivering Video Content for Safari](https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari).**
  Confirms `application/x-mpegURL` as the AirPlay-handoff MIME type
  and the expectation that Safari owns the receiver-side pipeline.
- **Internal — [media.md](./media.md).** Capability-shaped contracts
  on `Media` are the direction we're already heading; `LoadControl`
  is consistent with that grain.

## Open questions

- **`'loadstart'` vs. a typed adapter signal.**
  `'loadstart'` works on both adapters today but couples the bridge to an HTMLMediaElement event semantic. An explicit "engine ready" signal  on `Media` would be cleaner but is a wider contract change. Worth revisiting if more features need the same hook.
- **Cast / Chromium W3C suspend.** The feature's W3C branch (Chromium Cast) could also call `suspendLoad` on `remote.connect` / `resumeLoad` on `remote.disconnect`. Out of scope for this design.
- **In-flight appends during the transition.** The bridge stops  *new* loading on suspend; the currently-queued SourceBuffer append still completes. ~One segment of overlap. Acceptable; revisit if a user-visible artifact appears.
- Safari behavior to be noted. Claude mentions that "During the AirPlay session, Safari swaps `currentSrc` away from the MSE attachment; the MediaSource ends up in `'closed'` state and the SourceBuffers are no longer usable. Therefore A naive `engine.startLoad()` on AirPlay end is not safe on hls.js." `HlsMedia.resumeLoad()` would have to `detachMedia()` + `attachMedia(target)` + `startLoad()` to rebuild the attachment.
