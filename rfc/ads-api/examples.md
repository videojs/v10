# Format-Specific Usage Patterns

Player-side usage patterns for each IAB ad format under the [Video Ad API RFC](index.md). Each example consumes the four-level hierarchy `AdTrackList → AdTrack → AdCue → Ad` defined in [api.md](api.md). Adapter implementation (creating cues, advancing pods, firing tracking events) is out of scope for this document.

Examples that attach per-cue or per-ad listeners all follow the same wiring discipline: the track-level `cuechange` handler only detects which cue is active, and listeners are attached once per activation with an `AbortController` whose `signal` is passed to `addEventListener`. Aborting the controller when the cue deactivates removes every listener in one call, so repeated `cuechange` firings never accumulate duplicate handlers.

## Contents

- [Linear Ad](#linear-ad)
- [Pause Ad](#pause-ad)
- [Menu Ad](#menu-ad)
- [Squeezeback](#squeezeback)
- [Overlay](#overlay)
- [In-Scene Ad](#in-scene-ad)
- [Screensaver Ad](#screensaver-ad)

## Linear Ad

The `'linear'` `AdTrack` contains one `AdCue` per ad break (pre-roll, each mid-roll, post-roll). Each `AdCue`'s `ads` list holds the ordered pod of `Ad` instances.

Cues on the track carry `triggerType='timeline'` and `startTime`/`endTime` derived from the content timeline. As the playhead reaches a cue's start time, the cue transitions from `'scheduled'` to `'active'` and enters `activeCues`. The first `Ad` in the cue becomes active (`activeAd`). As each ad completes, the cue's `activeAd` advances to the next in the pod, firing `adchange` on the cue and `activated`/`completed` on the respective `Ad`s. When the final ad completes, the cue itself transitions to `'completed'` and exits `activeCues`.

**React to linear ad breaks:**

```typescript
const linearTrack = videoEl.adTracks.getTrackByFormat('linear');
if (linearTrack == null) {
  throw new Error('linear ad track not available');
}

let activeCue: AdCue | null = null;
let unwire: AbortController | null = null;

linearTrack.addEventListener('cuechange', () => {
  const cue = linearTrack.activeCues[0] ?? null;
  if (cue === activeCue) {
    return;
  }

  unwire?.abort();
  unwire = null;
  activeCue = cue;

  if (cue == null) {
    contentControls.hidden = false;
    adUI.hide();
    return;
  }

  contentControls.hidden = true;
  adUI.show(cue); // pod-level UI (progress, skip, etc.)

  // Wired once per break; aborting removes the listener when the cue ends.
  unwire = new AbortController();
  cue.addEventListener(
    'adchange',
    () => {
      adUI.updateForAd(cue.activeAd, cue.activeAd?.position ?? 0, cue.ads.length);
    },
    { signal: unwire.signal },
  );
});
```

## Pause Ad

The `'pause'` `AdTrack` contains one `AdCue` per pause session. When the viewer pauses content and a pause ad is available, a new `AdCue` appears on the track with `triggerType='user-action'` and `duration=null` (indeterminate). The cue's `ads` list holds one or more `Ad` instances to present during the pause. The cue enters `activeCues` immediately. When the viewer resumes, the cue transitions to `'completed'` with `dismissReason='content-resumed'`. If the pause ad supports refresh cycles, the active `Ad` fires `refresh` when the creative changes, rather than a new cue appearing.

**Render the pause ad overlay:**

```typescript
const pauseTrack = videoEl.adTracks.getTrackByFormat('pause');
if (pauseTrack == null) {
  throw new Error('pause ad track not available');
}

let activeCue: AdCue | null = null;
let unwire: AbortController | null = null;

pauseTrack.addEventListener('cuechange', () => {
  const cue = pauseTrack.activeCues[0] ?? null;
  if (cue === activeCue) {
    return;
  }

  unwire?.abort();
  unwire = null;
  activeCue = cue;

  const activeAd = cue?.activeAd;
  if (cue == null || activeAd == null) {
    pauseAdLayer.clear();
    return;
  }

  pauseAdLayer.render(activeAd);

  // Refresh listeners live only as long as this pause session.
  unwire = new AbortController();
  activeAd.addEventListener(
    'refresh',
    () => {
      const refreshed = cue.activeAd;
      if (refreshed == null) {
        return;
      }
      pauseAdLayer.render(refreshed); // swap the creative
    },
    { signal: unwire.signal },
  );
});
```

## Menu Ad

The `'menu'` `AdTrack` contains one `AdCue` per menu surface or navigation session that includes ads. Since menu ads exist outside video playback, the `AdTrackList` may be instantiated independently of any `HTMLVideoElement`. Each cue has `triggerType='user-action'` or `'device-state'`. The `adViewport` on each `Ad` is null because position is owned by the UI layer, not the ad API. The cue enters `activeCues` when the user navigates to the surface and exits when they navigate away (`dismissReason='navigated-away'`).

**Render each menu ad in the right UI slot:**

```typescript
// The menu AdTrackList is owned by the adapter (no HTMLVideoElement); the
// player reads from the shared instance the adapter populates.
const menuTrack = adapter.menuAdTrackList.getTrackByFormat('menu');
if (menuTrack == null) {
  throw new Error('menu ad track not available');
}

let activeCue: AdCue | null = null;
let unwire: AbortController | null = null;

menuTrack.addEventListener('cuechange', () => {
  const cue = menuTrack.activeCues[0] ?? null;
  if (cue === activeCue) {
    return;
  }

  unwire?.abort();
  unwire = null;
  activeCue = cue;

  headlineSlot.clear();
  tileGrid.clear();

  if (cue == null) {
    return;
  }

  // Ad listeners are scoped to this navigation session.
  unwire = new AbortController();
  const { signal } = unwire;

  for (let i = 0; i < cue.ads.length; i += 1) {
    const ad = cue.ads[i];
    const slotKey = ad.metadata['slot'];
    const slot = slotKey === 'headline' ? headlineSlot : tileGrid;
    slot.render(ad);
    ad.addEventListener('click', () => routeToAdvertiser(ad), { signal });
    ad.addEventListener('impression', () => measurement.record(ad), { signal });
  }
});
```

## Squeezeback

The `'squeezeback'` `AdTrack` contains one `AdCue` per squeezeback appearance. Each cue has `triggerType='programmatic'`. `SqueezebackMetadata` in `cue.metadata` carries `contentViewport` (an `AdViewport` describing where the player should resize content to), `transitionDuration`, and `audioEnabled`. Each `Ad` in the cue also declares its own `adViewport` (where the ad creative renders) and `contentViewport` (where content should be displayed alongside it). For the common L-Shape case, all ads in the cue share the same `contentViewport`. The cue transitions to `'activating'` when the content resize animation begins and to `'active'` when complete. Because `activeCues` includes `'activating'` cues, the cue is already transitioning when `cuechange` fires: the player starts the content resize as soon as it wires the cue, then listens for `'activated'` to render the ad regions.

**Animate the content resize and render the ads:**

```typescript
const sqTrack = videoEl.adTracks.getTrackByFormat('squeezeback');
if (sqTrack == null) {
  throw new Error('squeezeback ad track not available');
}

let activeCue: AdCue | null = null;
let unwire: AbortController | null = null;

sqTrack.addEventListener('cuechange', () => {
  const cue = sqTrack.activeCues[0] ?? null;
  if (cue === activeCue) {
    return;
  }

  unwire?.abort();
  unwire = null;
  activeCue = cue;

  if (cue == null) {
    // Animate back to fullscreen and clear ad regions.
    contentLayer.animateTo({ top: 0, right: 0, bottom: 0, left: 0 }, 1500);
    squeezebackLayer.clear();
    return;
  }

  const meta = cue.metadata as SqueezebackMetadata;

  // The cue is already 'activating' when it enters activeCues, so start the
  // content resize immediately instead of waiting for an already-fired event.
  contentLayer.animateTo(meta.contentViewport, meta.transitionDuration);

  // Render each ad in its own adViewport once the resize completes.
  unwire = new AbortController();
  cue.addEventListener(
    'activated',
    () => {
      for (let i = 0; i < cue.ads.length; i += 1) {
        const ad = cue.ads[i];
        if (ad.adViewport != null) {
          squeezebackLayer.render(ad, ad.adViewport);
        }
      }
    },
    { once: true, signal: unwire.signal },
  );
});
```

## Overlay

The `'overlay'` `AdTrack` contains one `AdCue` per overlay appearance. Each cue has `triggerType='programmatic'`. The `Ad` within the cue carries an `adViewport` that defines its screen region — for example, `{ top: 70, right: 0, bottom: 0, left: 0 }` for a lower-third overlay, or `{ top: 75, right: 0, bottom: 0, left: 75 }` for a bottom-right corner overlay. `contentViewport` is null on overlay `Ad`s because content continues playing at full screen. No format-specific metadata interface is needed; `supportsTransparency` lives on `AdCreative`. The cue enters `activeCues` immediately since overlays have no transition animation. Multiple overlay cues could theoretically be active simultaneously (all in `activeCues`), though this is uncommon. Minimum duration is 10 seconds per IAB guidelines.

**Render overlays non-destructively over content:**

```typescript
const overlayTrack = videoEl.adTracks.getTrackByFormat('overlay');
if (overlayTrack == null) {
  throw new Error('overlay ad track not available');
}

// Multiple overlay cues can be active at once, so wire each cue as it
// appears rather than tracking a single active cue.
const wired = new WeakSet<AdCue>();

overlayTrack.addEventListener('cuechange', () => {
  for (let c = 0; c < overlayTrack.activeCues.length; c += 1) {
    const cue = overlayTrack.activeCues[c];
    if (wired.has(cue)) {
      continue;
    }
    wired.add(cue);

    const unwire = new AbortController();
    const { signal } = unwire;

    for (let a = 0; a < cue.ads.length; a += 1) {
      const ad = cue.ads[a];
      if (ad.adViewport != null) {
        overlayLayer.render(ad, ad.adViewport);
      }
      ad.addEventListener('click', () => handleClickThrough(ad), { signal });
    }

    cue.addEventListener(
      'deactivated',
      () => {
        overlayLayer.remove(cue.id);
        unwire.abort();
      },
      { once: true },
    );
  }
});

// Viewer-initiated dismiss: call ad.dismiss() from the close button.
dismissButton.addEventListener('click', () => {
  overlayTrack.activeCues[0]?.activeAd?.dismiss();
});
```

## In-Scene Ad

The `'in-scene'` `AdTrack` contains one `AdCue` per composited brand placement. Each cue has `triggerType='composited'`. The API's role is primarily metadata and tracking: the cue carries timing information for when the composited element is visible, and the `Ad` within it carries creative details (static image, aspect ratio). `adViewport` is null on in-scene `Ad`s because the compositing pipeline owns positioning. `contentViewport` is null because the content frame is not modified. Impression events fire on the `Ad` based on brand exposure duration (minimum 3 seconds per IAB). `interactivity` is null on all in-scene `Ad`s.

**Fire impression tracking after the IAB minimum brand exposure:**

```typescript
const inSceneTrack = videoEl.adTracks.getTrackByFormat('in-scene');
if (inSceneTrack == null) {
  throw new Error('in-scene ad track not available');
}

const tracked = new WeakSet<AdCue>();

inSceneTrack.addEventListener('cuechange', () => {
  for (let i = 0; i < inSceneTrack.activeCues.length; i += 1) {
    const cue = inSceneTrack.activeCues[i];
    const ad = cue.activeAd;
    if (ad == null || tracked.has(cue)) {
      continue;
    }
    tracked.add(cue);

    // The API can't control rendering, but it can fire impression tracking
    // once the brand has been on-screen for >= 3 seconds.
    const minExposureMs = 3000;
    const fireImpression = window.setTimeout(() => {
      if (ad.state === 'active') {
        measurement.recordImpression(ad);
      }
    }, minExposureMs);

    cue.addEventListener(
      'deactivated',
      () => {
        window.clearTimeout(fireImpression);
      },
      { once: true },
    );
  }
});
```

## Screensaver Ad

The `'screensaver'` `AdTrack` mirrors the `'pause'` track but with `triggerType='device-state'` (inactivity timeout). Each cue represents a single screensaver session. The creative is 1920×1080 fullscreen. Duration is indeterminate. Refresh and autoplay behavior are signaled via `cue.metadata`. Dismiss reasons include `'viewer-dismissed'`, `'content-resumed'`, `'device-timeout'`, and `'app-exited'`.

**Full-screen takeover and dismiss:**

```typescript
const saverTrack = videoEl.adTracks.getTrackByFormat('screensaver');
if (saverTrack == null) {
  throw new Error('screensaver ad track not available');
}

saverTrack.addEventListener('cuechange', () => {
  const cue = saverTrack.activeCues[0];
  const activeAd = cue?.activeAd;
  if (activeAd != null) {
    screensaverLayer.show(activeAd);
  } else {
    screensaverLayer.hide();
  }
});

// Any remote-control input should dismiss the screensaver.
remote.on('anyKey', () => {
  saverTrack.activeCues[0]?.activeAd?.dismiss();
});
```
