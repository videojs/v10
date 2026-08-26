// SPF DRM smoke — the shared Mux DRM source through the standard HLS engine.
// http://localhost:5173/spf-drm/
//
// Supported query params:
//   drm=widevine|playready|fairplay   Configure only that key system, forcing
//                                     its negotiation on browsers with several
//                                     CDMs (Edge on Windows has Widevine AND
//                                     PlayReady; unfiltered, Widevine wins).
import { restrictDrmSystems, SOURCES } from '@app/shared/sources';
import type { DrmSystemsConfig, HlsVideoEngineSignals } from '@videojs/spf/hls';
import { createHlsVideoEngine } from '@videojs/spf/hls';

const video = document.getElementById('video') as HTMLVideoElement;
const statusPre = document.getElementById('status') as HTMLPreElement;

// The generic license-server flavor of the shared Mux DRM asset.
const source = restrictDrmSystems(
  SOURCES['hls-drm'].source as { src: string; drm: DrmSystemsConfig },
  new URLSearchParams(location.search).get('drm')
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
setInterval(() => {
  const quality = video.getVideoPlaybackQuality?.();

  statusPre.textContent = JSON.stringify(
    {
      readyState: video.readyState,
      currentTime: video.currentTime.toFixed(2),
      videoSize: `${video.videoWidth}x${video.videoHeight}`,
      framesDecoded: quality?.totalVideoFrames,
      framesDropped: quality?.droppedVideoFrames,
      awaitingMediaKeys: signals.state.awaitingMediaKeys.get(),
      mediaKeysAttached: Boolean(video.mediaKeys),
      keySystem: video.mediaKeys ? 'attached' : 'none',
      errors: signals.state.errors.get()?.map((error) => error.code),
    },
    null,
    2
  );
}, 500);

Object.assign(window as object, { engine, signals, video });
