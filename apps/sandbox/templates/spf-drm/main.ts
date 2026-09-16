// SPF DRM smoke — the shared Mux DRM source through the standard HLS engine.
// http://localhost:5173/spf-drm/
//
// Supported query params:
//   drm=widevine|playready|fairplay   Configure only that key system, forcing
//                                     its negotiation on browsers with several
//                                     CDMs (Edge on Windows has Widevine AND
//                                     PlayReady; unfiltered, Widevine wins).
//   source=<SOURCES key>              Any DRM entry; defaults to `hls-drm`.
//                                     `hls-drm-ezdrm` is the second FairPlay
//                                     provider the AirPlay smoke wants.
import { restrictDrmSystems, SOURCES } from '@app/shared/sources';
import type { DrmSystemsConfig, HlsVideoEngineSignals } from '@videojs/spf/hls';
import { createHlsVideoEngine } from '@videojs/spf/hls';

const video = document.getElementById('video') as HTMLVideoElement;
const statusPre = document.getElementById('status') as HTMLPreElement;

const params = new URLSearchParams(location.search);

// The generic license-server flavor of the shared Mux DRM asset by default.
const sourceKey = params.get('source') ?? 'hls-drm';
const source = restrictDrmSystems(
  SOURCES[sourceKey as keyof typeof SOURCES]?.source as { src: string; drm: DrmSystemsConfig },
  params.get('drm')
) as { src: string; drm: DrmSystemsConfig };

let signals!: HlsVideoEngineSignals;
const engine = createHlsVideoEngine({
  drm: source.drm,
  onSignalsReady: (refs) => {
    signals = refs;
  },
});

// preload before mediaElement: syncPreload reads the element's attribute when
// it first appears in context.
video.preload = 'auto';
signals.context.mediaElement.set(video);
signals.state.presentation.set({ url: source.src });

// Live status readout for the smoke probes (rendering, not just readyState).
//
// `mseKeys` vs `elementKeys` is the AirPlay handoff's invariant, readable at a
// glance. `mseKeys` is what `setupMediaKeys` published; `elementKeys` is
// whatever is actually attached. Outside a session they agree. During one the
// pair should read `false` / `true` — `setupMediaKeys` has yielded and
// `setupAirPlayFairPlay` is serving the receiver. `false` / `false` with a
// stalled `currentTime` means the receiver asked for nothing, or asked and was
// refused; check `errors`.
setInterval(() => {
  const quality = video.getVideoPlaybackQuality?.();

  statusPre.textContent = JSON.stringify(
    {
      readyState: video.readyState,
      currentTime: video.currentTime.toFixed(2),
      videoSize: `${video.videoWidth}x${video.videoHeight}`,
      framesDecoded: quality?.totalVideoFrames,
      framesDropped: quality?.droppedVideoFrames,
      // WebKit's raw flag, then the session fact `setupAirPlay` derives from it.
      wireless: (video as { webkitCurrentPlaybackTargetIsWireless?: boolean }).webkitCurrentPlaybackTargetIsWireless,
      loadingSuspended: signals.state.loadingSuspended?.get(),
      segmentLoadingBlocked: signals.state.segmentLoadingBlocked.get(),
      negotiatedKeySystem: signals.state.negotiatedKeySystem.get(),
      mseKeys: Boolean(signals.context.mediaKeys.get()),
      elementKeys: Boolean(video.mediaKeys),
      errors: signals.state.errors.get()?.map((error) => error.code),
    },
    null,
    2
  );
}, 500);

Object.assign(window as object, { engine, signals, video });
