# Format-Specific Usage Patterns

Adapter-side and player-side code for each IAB ad format under the [Video Ad API RFC](index.md). Each example maps to the four-level hierarchy `AdTrackList → AdTrack → AdCue → Ad` defined in [api.md](api.md).

## Contents

- [Linear Ad](#linear-ad)
- [Pause Ad](#pause-ad)
- [Menu Ad](#menu-ad)
- [Squeezeback](#squeezeback)
- [Overlay](#overlay)
- [In-Scene Ad](#in-scene-ad)
- [Screensaver Ad](#screensaver-ad)

## Linear Ad

The LINEAR `AdTrack` contains one `AdCue` per ad break (pre-roll, each mid-roll, post-roll). Each `AdCue`'s `ads` list holds the ordered pod of `Ad` instances.

When the ad server responds with a break schedule, the adapter populates cues on the track with `triggerType=TIMELINE` and `startTime`/`endTime` derived from the content timeline. As the playhead reaches a cue's start time, the cue transitions from SCHEDULED to ACTIVE and enters `activeCues`. The first `Ad` in the cue becomes active (`activeAd`). As each ad completes, the cue's `activeAd` advances to the next in the pod, firing `adchange` on the cue and `activated`/`completed` on the respective `Ad`s. When the final ad completes, the cue itself transitions to COMPLETED and exits `activeCues`.

**Adapter-side — populate LINEAR track from a VMAP response:**

```typescript
const linearTrack = videoEl.adTracks.getTrackByFormat(AdFormat.LINEAR);
if (linearTrack == null) {
  throw new Error('LINEAR ad track not available');
}

// Given a parsed VMAP containing break schedules and their ad pods:
for (const breakSchedule of vmap.breaks) {
  adapter.createCue(linearTrack, {
    triggerType: AdTriggerType.TIMELINE,
    startTime: breakSchedule.timeOffset,
    endTime: breakSchedule.timeOffset + breakSchedule.totalDuration,
    duration: breakSchedule.totalDuration,
    metadata: { breakId: breakSchedule.id, breakType: breakSchedule.breakType },
    ads: breakSchedule.ads.map((vastAd, i) =>
      adapter.createAd({
        creative: parseVastCreative(vastAd),
        adViewport: { top: 0, right: 0, bottom: 0, left: 0 },
        contentViewport: null, // content is replaced during linear breaks
        duration: vastAd.duration,
        skippable: vastAd.skipOffset !== null,
        skipOffset: vastAd.skipOffset,
        audioPolicy: 'required',
        position: i,
        metadata: { vastAdId: vastAd.id },
      }),
    ),
  });
  // 'addcue' fires on linearTrack.
}

// As the playhead crosses cue.startTime the player drives the cue active
// (see decisions.md, Open Question: Cue lifecycle ownership). When a cue is
// ACTIVE, the adapter advances activeAd through the pod and fires quartiles
// and timeupdate on each Ad.
```

**Player-side — react to linear ad breaks:**

```typescript
const linearTrack = videoEl.adTracks.getTrackByFormat(AdFormat.LINEAR);
if (linearTrack == null) {
  throw new Error('LINEAR ad track not available');
}

linearTrack.addEventListener('change', () => {
  const cue = linearTrack.activeCues[0];
  if (cue) {
    contentControls.hidden = true;
    adUI.show(cue); // pod-level UI (progress, skip, etc.)
  } else {
    contentControls.hidden = false;
    adUI.hide();
  }
});

// Track which ad is currently playing within the pod:
linearTrack.addEventListener('change', () => {
  const cue = linearTrack.activeCues[0];
  cue?.addEventListener('adchange', () => {
    const currentCue = linearTrack.activeCues[0];
    if (currentCue == null) {
      return;
    }
    adUI.updateForAd(
      currentCue.activeAd,
      currentCue.activeAd?.position ?? 0,
      currentCue.ads.length,
    );
  });
});
```

## Pause Ad

The PAUSE `AdTrack` contains one `AdCue` per pause session. When the viewer pauses content and a pause ad is available, the adapter creates an `AdCue` with `triggerType=USER_ACTION` and `duration=null` (indeterminate). The cue's `ads` list holds one or more `Ad` instances to present during the pause. The cue enters `activeCues` immediately. When the viewer resumes, the cue transitions to COMPLETED with `dismissReason=CONTENT_RESUMED`. If the pause ad supports refresh cycles, the adapter fires `refresh` on the active `Ad` when the creative changes, rather than creating a new cue.

**Adapter-side — request a pause ad on pause, dismiss on resume:**

```typescript
const pauseTrack = videoEl.adTracks.getTrackByFormat(AdFormat.PAUSE);
if (pauseTrack == null) {
  throw new Error('PAUSE ad track not available');
}

videoEl.addEventListener('pause', () => {
  void (async () => {
    const vastResponse = await pauseAdServer.request({
      contentId: currentContentId,
      pauseDurationHint: null,
    });
    if (!vastResponse) {
      return;
    }

    const cue = adapter.createCue(pauseTrack, {
      triggerType: AdTriggerType.USER_ACTION,
      duration: null, // indeterminate; dismissed on resume
      ads: [
        adapter.createAd({
          creative: parseVastCreative(vastResponse),
          adViewport: { top: 0, right: 0, bottom: 0, left: 0 },
          contentViewport: null,
          duration: null,
          skippable: false,
          skipOffset: null,
          audioPolicy: 'none',
          position: 0,
        }),
      ],
    });
    adapter.activate(cue);
    // state: SCHEDULED -> ACTIVE, fires 'activated'
  })();
});

videoEl.addEventListener('play', () => {
  for (let i = 0; i < pauseTrack.activeCues.length; i += 1) {
    const cue = pauseTrack.activeCues[i];
    adapter.deactivate(cue, DismissReason.CONTENT_RESUMED);
  }
});

// Refresh cycle (e.g., every 30s of pause): replace creative in place.
setInterval(() => {
  const cue = pauseTrack.activeCues[0];
  const activeAd = cue?.activeAd;
  if (activeAd == null) {
    return;
  }
  adapter.refreshAd(activeAd, nextCreative()); // fires 'refresh' on the Ad
}, 30_000);
```

**Player-side — render the pause ad overlay:**

```typescript
const pauseTrack = videoEl.adTracks.getTrackByFormat(AdFormat.PAUSE);
if (pauseTrack == null) {
  throw new Error('PAUSE ad track not available');
}

pauseTrack.addEventListener('change', () => {
  const cue = pauseTrack.activeCues[0];
  if (cue == null) {
    pauseAdLayer.clear();
    return;
  }

  const activeAd = cue.activeAd;
  if (activeAd == null) {
    pauseAdLayer.clear();
    return;
  }

  pauseAdLayer.render(activeAd);

  activeAd.addEventListener('refresh', () => {
    const refreshed = cue.activeAd;
    if (refreshed == null) {
      return;
    }
    pauseAdLayer.render(refreshed); // swap the creative
  });
});
```

## Menu Ad

The MENU `AdTrack` contains one `AdCue` per menu surface or navigation session that includes ads. Since menu ads exist outside video playback, the `AdTrackList` may be instantiated independently of any `HTMLVideoElement`. Each cue has `triggerType=USER_ACTION` or `DEVICE_STATE`. The `adViewport` on each `Ad` is null because position is owned by the UI layer, not the ad API. The cue enters `activeCues` when the user navigates to the surface and exits when they navigate away (`dismissReason=NAVIGATED_AWAY`).

**Adapter-side — standalone AdTrackList (no video element):**

```typescript
// Menu ads live outside video playback, so the adapter instantiates its own
// AdTrackList that isn't attached to an HTMLVideoElement.
const menuManager = adapter.createStandaloneAdTrackList();
const menuTrack = menuManager.getTrackByFormat(AdFormat.MENU);
if (menuTrack == null) {
  throw new Error('MENU ad track not available');
}

navigation.addEventListener('enterSurface', (e: Event) => {
  void (async () => {
    const { surfaceId } = (e as CustomEvent<{ surfaceId: string }>).detail; // 'home', 'details', ...
    const ads = await menuAdServer.fetch({ surface: surfaceId });
    if (!ads.length) {
      return;
    }

    const cue = adapter.createCue(menuTrack, {
      triggerType: AdTriggerType.USER_ACTION,
      duration: null,
      metadata: { surface: surfaceId },
      ads: ads.map((a, i) =>
        adapter.createAd({
          creative: a.creative,
          adViewport: null,    // EXTERNAL placement: position owned by the UI
          contentViewport: null,
          duration: null,
          skippable: false,
          skipOffset: null,
          audioPolicy: 'none',
          position: i,
          metadata: { slot: a.slot }, // e.g. 'headline' | 'tile'
        }),
      ),
    });
    adapter.activate(cue);
  })();
});

navigation.addEventListener('leaveSurface', () => {
  for (let i = 0; i < menuTrack.activeCues.length; i += 1) {
    const cue = menuTrack.activeCues[i];
    adapter.deactivate(cue, DismissReason.NAVIGATED_AWAY);
  }
});
```

**Player-side — render each menu ad in the right UI slot:**

```typescript
const menuManager = adapter.createStandaloneAdTrackList();
const menuTrack = menuManager.getTrackByFormat(AdFormat.MENU);
if (menuTrack == null) {
  throw new Error('MENU ad track not available');
}

menuTrack.addEventListener('change', () => {
  headlineSlot.clear();
  tileGrid.clear();

  const cue = menuTrack.activeCues[0];
  if (cue == null) {
    return;
  }

  for (let i = 0; i < cue.ads.length; i += 1) {
    const ad = cue.ads[i];
    const slotKey = ad.metadata['slot'];
    const slot = slotKey === 'headline' ? headlineSlot : tileGrid;
    slot.render(ad);
    ad.addEventListener('click', () => {
      routeToAdvertiser(ad);
    });
    ad.addEventListener('impression', () => {
      measurement.record(ad);
    });
  }
});
```

## Squeezeback

The SQUEEZEBACK `AdTrack` contains one `AdCue` per squeezeback appearance. Each cue has `triggerType=PROGRAMMATIC`. `SqueezebackMetadata` in `cue.metadata` carries `contentViewport` (an `AdViewport` describing where the player should resize content to), `transitionDuration`, and `audioEnabled`. Each `Ad` in the cue also declares its own `adViewport` (where the ad creative renders) and `contentViewport` (where content should be displayed alongside it). For the common L-Shape case, all ads in the cue share the same `contentViewport`. The cue transitions to ACTIVATING when the content resize animation begins and to ACTIVE when complete. The player uses the `activating`/`deactivating` events on the cue as animation start/stop signals.

**Adapter-side — trigger an L-Shape squeezeback with two concurrent Ads:**

```typescript
const sqTrack = videoEl.adTracks.getTrackByFormat(AdFormat.SQUEEZEBACK);
if (sqTrack == null) {
  throw new Error('SQUEEZEBACK ad track not available');
}

async function triggerLShapeSqueezeback(): Promise<void> {
  const response = await adServer.requestSqueezeback({ layout: 'L_SHAPE' });

  // Content is resized into the upper-left 60% region.
  const lShapeContentViewport: AdViewport = { top: 0, right: 40, bottom: 40, left: 0 };

  const metadata: SqueezebackMetadata = {
    contentViewport: lShapeContentViewport,
    transitionDuration: 1500, // 1.5s resize animation
    audioEnabled: false,
  };

  const cue = adapter.createCue(sqTrack, {
    triggerType: AdTriggerType.PROGRAMMATIC,
    duration: 15, // min 10s per IAB; 15s here
    metadata,
    ads: [
      // Bottom bar — fills the bottom 40% of the screen.
      adapter.createAd({
        creative: response.bottomCreative,
        adViewport: { top: 60, right: 0, bottom: 0, left: 0 },
        contentViewport: lShapeContentViewport,
        duration: 15,
        skippable: false,
        skipOffset: null,
        audioPolicy: 'none',
        position: 0,
      }),
      // Right sidebar — fills the right 40% above the bottom bar.
      adapter.createAd({
        creative: response.rightCreative,
        adViewport: { top: 0, right: 0, bottom: 40, left: 60 },
        contentViewport: lShapeContentViewport,
        duration: 15,
        skippable: false,
        skipOffset: null,
        audioPolicy: 'none',
        position: 1,
      }),
    ],
  });

  adapter.activate(cue);
  // fires 'activating' (state: ACTIVATING)
  // then 'activated' (state: ACTIVE) after animation
}
```

**Player-side — animate the content resize and render the ads:**

```typescript
const sqTrack = videoEl.adTracks.getTrackByFormat(AdFormat.SQUEEZEBACK);
if (sqTrack == null) {
  throw new Error('SQUEEZEBACK ad track not available');
}

sqTrack.addEventListener('change', () => {
  const cue = sqTrack.activeCues[0];

  if (cue == null) {
    // Animate back to fullscreen and clear ad regions.
    contentLayer.animateTo({ top: 0, right: 0, bottom: 0, left: 0 }, 1500);
    squeezebackLayer.clear();
    return;
  }

  const meta = cue.metadata as SqueezebackMetadata;

  // 'activating' fires when the resize should start.
  cue.addEventListener('activating', () => {
    contentLayer.animateTo(meta.contentViewport, meta.transitionDuration);
  });

  // Render each ad in its own adViewport as soon as the cue is ACTIVE.
  cue.addEventListener('activated', () => {
    for (let i = 0; i < cue.ads.length; i += 1) {
      const ad = cue.ads[i];
      const adViewport = ad.adViewport;
      if (adViewport != null) {
        squeezebackLayer.render(ad, adViewport);
      }
    }
  });
});
```

## Overlay

The OVERLAY `AdTrack` contains one `AdCue` per overlay appearance. Each cue has `triggerType=PROGRAMMATIC`. The `Ad` within the cue carries an `adViewport` that defines its screen region — for example, `{ top: 70, right: 0, bottom: 0, left: 0 }` for a lower-third overlay, or `{ top: 75, right: 0, bottom: 0, left: 75 }` for a bottom-right corner overlay. `contentViewport` is null on overlay `Ad`s because content continues playing at full screen. No format-specific metadata interface is needed; `supportsTransparency` lives on `AdCreative`. The cue enters `activeCues` immediately since overlays have no transition animation. Multiple overlay cues could theoretically be active simultaneously (all in `activeCues`), though this is uncommon. Minimum duration is 10 seconds per IAB guidelines.

**Adapter-side — show a lower-third overlay:**

```typescript
const overlayTrack = videoEl.adTracks.getTrackByFormat(AdFormat.OVERLAY);
if (overlayTrack == null) {
  throw new Error('OVERLAY ad track not available');
}

async function showLowerThirdOverlay(): Promise<void> {
  const response = await adServer.requestOverlay();

  const cue = adapter.createCue(overlayTrack, {
    triggerType: AdTriggerType.PROGRAMMATIC,
    duration: 15,
    ads: [
      adapter.createAd({
        creative: {
          ...response.creative,
          supportsTransparency: true, // alpha-channel WebP / PNG
        },
        adViewport: { top: 70, right: 0, bottom: 0, left: 0 }, // bottom 30%
        contentViewport: null, // content continues fullscreen behind the overlay
        duration: 15,
        skippable: true, // overlays should offer dismiss affordance
        skipOffset: 0,
        audioPolicy: 'none',
        position: 0,
      }),
    ],
  });

  adapter.activate(cue);
}
```

**Player-side — render overlays non-destructively over content:**

```typescript
const overlayTrack = videoEl.adTracks.getTrackByFormat(AdFormat.OVERLAY);
if (overlayTrack == null) {
  throw new Error('OVERLAY ad track not available');
}

overlayTrack.addEventListener('change', () => {
  overlayLayer.clear();

  // Multiple overlay cues can theoretically be active at once.
  for (let c = 0; c < overlayTrack.activeCues.length; c += 1) {
    const cue = overlayTrack.activeCues[c];
    for (let a = 0; a < cue.ads.length; a += 1) {
      const ad = cue.ads[a];
      const adViewport = ad.adViewport;
      if (adViewport != null) {
        overlayLayer.render(ad, adViewport);
      }
      ad.addEventListener('click', () => {
        handleClickThrough(ad);
      });
    }

    cue.addEventListener('deactivated', () => {
      overlayLayer.remove(cue.id);
    });
  }
});

// Viewer-initiated dismiss: call ad.dismiss() from the close button.
dismissButton.addEventListener('click', () => {
  overlayTrack.activeCues[0]?.activeAd?.dismiss();
});
```

## In-Scene Ad

The IN_SCENE `AdTrack` contains one `AdCue` per composited brand placement. Each cue has `triggerType=COMPOSITED`. The API's role is primarily metadata and tracking: the cue carries timing information for when the composited element is visible, and the `Ad` within it carries creative details (static image, aspect ratio). `adViewport` is null on in-scene `Ad`s because the compositing pipeline owns positioning. `contentViewport` is null because the content frame is not modified. Impression events fire on the `Ad` based on brand exposure duration (minimum 3 seconds per IAB). `interactivity` is null on all in-scene `Ad`s.

**Adapter-side — register composited placements from a manifest:**

```typescript
const inSceneTrack = videoEl.adTracks.getTrackByFormat(AdFormat.IN_SCENE);
if (inSceneTrack == null) {
  throw new Error('IN_SCENE ad track not available');
}

// The compositing pipeline tells us which placements were burned into the
// transcoded stream, and when each is on-screen.
for (const placement of compositionManifest.inSceneAds) {
  adapter.createCue(inSceneTrack, {
    triggerType: AdTriggerType.COMPOSITED,
    startTime: placement.startTime,
    endTime: placement.endTime,
    duration: placement.endTime - placement.startTime,
    metadata: { sceneId: placement.sceneId },
    ads: [
      adapter.createAd({
        creative: {
          assetUrl: placement.billboardUrl,
          mimeType: 'image/png',
          width: placement.width,
          height: placement.height,
          aspectRatio: placement.aspectRatio, // '16:9' | '9:16' | ...
          fileSize: placement.fileSize,
          bitrate: null,
          codec: null,
          supportsTransparency: false,
          adId: placement.adId,
          creativeId: placement.creativeId,
          adTitle: placement.adTitle,
          clickThroughUrl: null, // in-scene ads are non-interactive
        },
        adViewport: null,      // compositing pipeline owns positioning
        contentViewport: null, // content frame is not modified
        duration: placement.endTime - placement.startTime,
        skippable: false,
        skipOffset: null,
        audioPolicy: 'none',
        position: 0,
        interactivity: null,
      }),
    ],
  });
}
```

**Player-side — fire impression after the IAB minimum brand exposure:**

```typescript
const inSceneTrack = videoEl.adTracks.getTrackByFormat(AdFormat.IN_SCENE);
if (inSceneTrack == null) {
  throw new Error('IN_SCENE ad track not available');
}

inSceneTrack.addEventListener('change', () => {
  for (let i = 0; i < inSceneTrack.activeCues.length; i += 1) {
    const cue = inSceneTrack.activeCues[i];
    const ad = cue.activeAd;
    if (ad == null) {
      continue;
    }

    // The API can't control rendering, but it can fire impression tracking
    // once the brand has been on-screen for >= 3 seconds.
    const minExposureMs = 3000;
    const fireImpression = window.setTimeout(() => {
      if (ad.state === AdState.ACTIVE) {
        measurement.recordImpression(ad);
        ad.dispatchEvent(new CustomEvent('impression'));
      }
    }, minExposureMs);

    cue.addEventListener('deactivated', () => {
      window.clearTimeout(fireImpression);
    });
  }
});
```

## Screensaver Ad

The SCREENSAVER `AdTrack` mirrors the PAUSE track but with `triggerType=DEVICE_STATE` (inactivity timeout). Each cue represents a single screensaver session. The creative is 1920×1080 fullscreen. Duration is indeterminate. Refresh and autoplay behavior are signaled via `cue.metadata`. Dismiss reasons include VIEWER_DISMISSED, CONTENT_RESUMED, DEVICE_TIMEOUT, and APP_EXITED.

**Adapter-side — trigger on inactivity, dismiss on any input:**

```typescript
const saverTrack = videoEl.adTracks.getTrackByFormat(AdFormat.SCREENSAVER);
if (saverTrack == null) {
  throw new Error('SCREENSAVER ad track not available');
}

inactivityMonitor.on('timeout', () => {
  void (async () => {
    const response = await adServer.requestScreensaver();

    const cue = adapter.createCue(saverTrack, {
      triggerType: AdTriggerType.DEVICE_STATE,
      duration: null, // indeterminate; dismissed on input or device timeout
      metadata: {
        autoRefresh: true,
        refreshIntervalMs: 30_000,
      },
      ads: [
        adapter.createAd({
          creative: response.creative, // 1920x1080 fullscreen
          adViewport: { top: 0, right: 0, bottom: 0, left: 0 },
          contentViewport: null,
          duration: null,
          skippable: false,
          skipOffset: null,
          audioPolicy: 'none',
          position: 0,
        }),
      ],
    });

    adapter.activate(cue);
  })();
});

inactivityMonitor.on('activity', () => {
  for (let i = 0; i < saverTrack.activeCues.length; i += 1) {
    const cue = saverTrack.activeCues[i];
    adapter.deactivate(cue, DismissReason.CONTENT_RESUMED);
  }
});

deviceEvents.on('sleep', () => {
  for (let i = 0; i < saverTrack.activeCues.length; i += 1) {
    const cue = saverTrack.activeCues[i];
    adapter.deactivate(cue, DismissReason.DEVICE_TIMEOUT);
  }
});
```

**Player-side — full-screen takeover and dismiss:**

```typescript
const saverTrack = videoEl.adTracks.getTrackByFormat(AdFormat.SCREENSAVER);
if (saverTrack == null) {
  throw new Error('SCREENSAVER ad track not available');
}

saverTrack.addEventListener('change', () => {
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
  const cue = saverTrack.activeCues[0];
  if (cue != null) {
    adapter.deactivate(cue, DismissReason.VIEWER_DISMISSED);
  }
});
```
